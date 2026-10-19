// Gateway de retos: plano de datos. NO tiene acceso a Docker.
//  - :8081 (público): enruta <sid>.lab.<dominio> al contenedor de esa sesión.
//  - :8082 (admin): el orquestador registra/borra rutas con un token.
// Cada reto se sirve desde su propio origen (subdominio por sesión) para que ningún reto
// pueda compartir cookies ni origen con la plataforma web.
const http = require("node:http");
const crypto = require("node:crypto");
const dns = require("node:dns/promises");

const TOKEN = process.env.GATEWAY_TOKEN || "";
const PUBLIC_PORT = Number(process.env.PUBLIC_PORT || 8081);
const ADMIN_PORT = Number(process.env.ADMIN_PORT || 8082);
const SID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UPSTREAM_RE = /^http:\/\/cl-[0-9a-f-]{36}:\d{1,5}$/;
const HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "host"]);

if (TOKEN.length < 32) {
  console.error("GATEWAY_TOKEN debe tener al menos 32 caracteres");
  process.exit(1);
}

/** sid -> { upstream, lastSeen } */
const routes = new Map();

// ---------- proxy público ----------
http
  .createServer((req, res) => {
    const sid = (req.headers.host || "").split(":")[0].split(".")[0];
    const route = SID_RE.test(sid) ? routes.get(sid) : undefined;
    if (!route) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("Sesión no encontrada o expirada");
    }
    route.lastSeen = Date.now();

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) if (!HOP.has(k)) headers[k] = v;
    const up = new URL(route.upstream);
    const proxied = http.request(
      { hostname: up.hostname, port: up.port, path: req.url, method: req.method, headers, timeout: 30_000 },
      (upRes) => {
        const out = {};
        for (const [k, v] of Object.entries(upRes.headers)) if (!HOP.has(k)) out[k] = v;
        out["referrer-policy"] = "no-referrer";
        out["x-content-type-options"] = "nosniff";
        res.writeHead(upRes.statusCode || 502, out);
        upRes.pipe(res);
      },
    );
    proxied.on("timeout", () => proxied.destroy(new Error("timeout")));
    proxied.on("error", () => {
      if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
      res.end("El reto no responde");
    });
    req.pipe(proxied);
  })
  .on("upgrade", (req, socket) => socket.destroy()) // WebSockets: fuera de alcance de la Fase 1
  .listen(PUBLIC_PORT, "0.0.0.0", () => console.log(`gateway public on ${PUBLIC_PORT}`));

// ---------- admin ----------
const authorized = (req) => {
  const given = Buffer.from(req.headers.authorization || "");
  const want = Buffer.from(`Bearer ${TOKEN}`);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
};
const send = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

// Además del token, la API admin solo acepta conexiones desde el orquestador (por IP).
// El gateway está conectado a las redes de cada sesión; un reto no debe poder ni intentar usarla.
const ALLOWED_HOST = process.env.ADMIN_ALLOWED_HOST || "orchestrator";
let allowedIps = { at: 0, ips: new Set() };
async function fromOrchestrator(req) {
  if (Date.now() - allowedIps.at > 5000) {
    const found = await dns.lookup(ALLOWED_HOST, { all: true }).catch(() => []);
    allowedIps = { at: Date.now(), ips: new Set(found.map((f) => f.address)) };
  }
  return allowedIps.ips.has((req.socket.remoteAddress || "").replace(/^::ffff:/, ""));
}

http
  .createServer(async (req, res) => {
    if (!(await fromOrchestrator(req))) return send(res, 403, { error: "forbidden" });
    if (!authorized(req)) return send(res, 401, { error: "unauthorized" });
    const url = new URL(req.url, "http://x");
    if (req.method === "GET" && url.pathname === "/routes") {
      return send(res, 200, { routes: [...routes].map(([sid, r]) => ({ sid, lastSeen: r.lastSeen })) });
    }
    const m = url.pathname.match(/^\/routes\/([^/]+)$/);
    if (!m || !SID_RE.test(m[1])) return send(res, 404, { error: "not found" });
    if (req.method === "DELETE") {
      routes.delete(m[1]);
      return send(res, 200, { ok: true });
    }
    if (req.method === "PUT") {
      const chunks = [];
      for await (const c of req) {
        chunks.push(c);
        if (chunks.length > 8) return send(res, 413, { error: "too large" });
      }
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        return send(res, 400, { error: "bad json" });
      }
      // El upstream solo puede ser el contenedor de esa sesión (evita SSRF desde la API admin).
      if (typeof body.upstream !== "string" || !UPSTREAM_RE.test(body.upstream) || !body.upstream.includes(`cl-${m[1]}:`)) {
        return send(res, 400, { error: "upstream inválido" });
      }
      routes.set(m[1], { upstream: body.upstream, lastSeen: Date.now() });
      return send(res, 200, { ok: true });
    }
    send(res, 405, { error: "method not allowed" });
  })
  .listen(ADMIN_PORT, "0.0.0.0");
