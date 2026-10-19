// Orquestador de sesiones de reto. Único componente que habla con Docker (vía socket-proxy).
// Es el punto de política: ignora cualquier opción de aislamiento que venga en la petición y
// aplica siempre las mismas restricciones. Sin dependencias externas.
const http = require("node:http");
const crypto = require("node:crypto");

const DOCKER = process.env.DOCKER_URL || "http://dockerproxy:2375";
const TOKEN = process.env.ORCH_TOKEN || "";
const GATEWAY_URL = process.env.GATEWAY_URL || "http://gateway:8082";
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || "";
const GATEWAY_CONTAINER = process.env.GATEWAY_CONTAINER || "cyberlab-gateway";
const PORT = Number(process.env.PORT || 4000);

if (TOKEN.length < 32 || GATEWAY_TOKEN.length < 32) {
  console.error("ORCH_TOKEN y GATEWAY_TOKEN deben tener al menos 32 caracteres");
  process.exit(1);
}

// ---------- política ----------
const SID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const IMAGE_RE = /^cyberlab\/[a-z0-9][a-z0-9-]*:[A-Za-z0-9._-]+$/;
const ENV_NAME_RE = /^[A-Z][A-Z0-9_]{0,31}$/;
const clamp = (v, min, max, d) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
const netName = (sid) => `cyberlab-s-${sid}`;
const ctrName = (sid) => `cl-${sid}`;

// ---------- cliente Docker ----------
async function docker(method, path, body) {
  const res = await fetch(`${DOCKER}${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const ok = (r, allow404 = false) => {
  if ((r.status >= 200 && r.status < 300) || (allow404 && r.status === 404)) return r;
  throw new Error(`docker ${r.status}: ${typeof r.data === "string" ? r.data : JSON.stringify(r.data)}`);
};

async function gateway(method, path, body) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: { authorization: `Bearer ${GATEWAY_TOKEN}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 404) throw new Error(`gateway ${res.status}`);
  return res.status === 404 ? null : res.json().catch(() => null);
}

// ---------- operaciones ----------
async function createSession({ sid, image, port, limits = {}, env = {} }) {
  if (!SID_RE.test(sid)) throw httpError(400, "sid inválido");
  if (!IMAGE_RE.test(image)) throw httpError(400, "imagen no permitida");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw httpError(400, "puerto inválido");
  const envList = Object.entries(env).map(([k, v]) => {
    if (!ENV_NAME_RE.test(k) || typeof v !== "string" || v.length > 256) throw httpError(400, "variable inválida");
    return `${k}=${v}`;
  });

  const memory = clamp(limits.memoria_mb, 16, 1024, 128) * 1024 * 1024;
  const cpus = clamp(limits.cpus, 0.1, 2, 0.25);
  const pids = clamp(limits.pids, 16, 512, 64);
  const net = netName(sid);
  const name = ctrName(sid);
  const labels = { "cyberlab.managed": "true", "cyberlab.session": sid };

  try {
    // Red por sesión SIN salida: internal=true => sin Internet, sin host, sin otras sesiones.
    ok(await docker("POST", "/networks/create", { Name: net, Driver: "bridge", Internal: true, Labels: labels }));
    const created = ok(
      await docker("POST", `/containers/create?name=${name}`, {
        Image: image,
        Env: envList,
        User: "65534:65534", // nobody: nunca root
        Labels: labels,
        HostConfig: {
          NetworkMode: net,
          Memory: memory,
          MemorySwap: memory, // sin swap
          NanoCpus: Math.round(cpus * 1e9),
          PidsLimit: pids,
          ReadonlyRootfs: true,
          CapDrop: ["ALL"],
          SecurityOpt: ["no-new-privileges:true"],
          Tmpfs: { "/tmp": "rw,noexec,nosuid,nodev,size=16m" },
          Privileged: false,
          PublishAllPorts: false,
          RestartPolicy: { Name: "no" },
          Ulimits: [{ Name: "nofile", Soft: 256, Hard: 256 }],
          Dns: [],
        },
        NetworkingConfig: { EndpointsConfig: { [net]: { Aliases: [name] } } },
      }),
    );
    ok(await docker("POST", `/containers/${name}/start`));
    ok(await docker("POST", `/networks/${net}/connect`, { Container: GATEWAY_CONTAINER }));
    await gateway("PUT", `/routes/${sid}`, { upstream: `http://${name}:${port}` });
    return { containerId: created.data.Id, network: net };
  } catch (err) {
    await destroySession(sid).catch(() => {});
    throw err;
  }
}

async function destroySession(sid) {
  if (!SID_RE.test(sid)) throw httpError(400, "sid inválido");
  const net = netName(sid);
  await gateway("DELETE", `/routes/${sid}`).catch(() => {});
  ok(await docker("POST", `/networks/${net}/disconnect`, { Container: GATEWAY_CONTAINER, Force: true }), true);
  ok(await docker("DELETE", `/containers/${ctrName(sid)}?force=true&v=true`), true);
  ok(await docker("DELETE", `/networks/${net}`), true);
}

async function listSessions() {
  const filters = encodeURIComponent(JSON.stringify({ label: ["cyberlab.managed=true"] }));
  const r = ok(await docker("GET", `/containers/json?all=true&filters=${filters}`));
  return r.data.map((c) => ({ sid: c.Labels["cyberlab.session"], state: c.State, created: c.Created }));
}

// ---------- HTTP ----------
function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function authorized(req) {
  const given = Buffer.from(req.headers.authorization || "");
  const want = Buffer.from(`Bearer ${TOKEN}`);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 16_384) throw httpError(413, "cuerpo demasiado grande");
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || "{}");
  } catch {
    throw httpError(400, "JSON inválido");
  }
}

const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

http
  .createServer(async (req, res) => {
    try {
      if (req.url === "/health") return send(res, 200, { status: "ok" });
      if (!authorized(req)) return send(res, 401, { error: "unauthorized" });
      const url = new URL(req.url, "http://x");

      if (req.method === "POST" && url.pathname === "/sessions") {
        return send(res, 201, await createSession(await readJson(req)));
      }
      if (req.method === "GET" && url.pathname === "/sessions") {
        return send(res, 200, { sessions: await listSessions() });
      }
      if (req.method === "GET" && url.pathname === "/activity") {
        const g = await gateway("GET", "/routes");
        return send(res, 200, { activity: (g && g.routes) || [] });
      }
      const m = url.pathname.match(/^\/sessions\/([^/]+)$/);
      if (req.method === "DELETE" && m) {
        await destroySession(m[1]);
        return send(res, 200, { ok: true });
      }
      send(res, 404, { error: "not found" });
    } catch (err) {
      const status = err.status || 500;
      if (status === 500) console.error("orchestrator:", err.message);
      send(res, status, { error: status === 500 ? "internal error" : err.message });
    }
  })
  .listen(PORT, "0.0.0.0", () => console.log(`orchestrator listening on ${PORT}`));

module.exports = { listSessions, destroySession };
