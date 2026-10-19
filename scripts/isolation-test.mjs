// Pruebas de aislamiento. Crea dos sesiones del reto canario y verifica, desde dentro del
// contenedor, que no hay salida a Internet, ni acceso al host, a la BD, a la app, al orquestador,
// a Docker ni a otras sesiones; y que el contenedor está endurecido.
// Ejecutar dentro del contenedor app: docker compose exec app npm run test:isolation
// Requiere la imagen cyberlab/canary:latest (npm run build:challenges en el host).
import { randomUUID } from "node:crypto";
import http from "node:http";

const ORCH = process.env.ORCH_URL;
const TOKEN = process.env.ORCH_TOKEN;
const GATEWAY = process.env.GATEWAY_PUBLIC_URL ?? "http://gateway:8081";
if (!ORCH || !TOKEN) {
  console.error("ORCH_URL y ORCH_TOKEN son obligatorios");
  process.exit(2);
}

const orch = (method, path, body) =>
  fetch(ORCH + path, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

// fetch() no permite sobrescribir Host; se usa node:http para enrutar por subdominio de sesión.
const viaGateway = (sid, path) =>
  new Promise((resolve, reject) => {
    const u = new URL(GATEWAY);
    const req = http.get(
      { hostname: u.hostname, port: u.port, path, headers: { host: `${sid}.lab.test` }, timeout: 30_000 },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch {
            reject(new Error(`respuesta no JSON del gateway (${res.statusCode})`));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });

const sessions = [];
async function start() {
  const sid = randomUUID();
  const res = await orch("POST", "/sessions", {
    sid,
    image: "cyberlab/canary:latest",
    port: 8080,
    limits: { memoria_mb: 64, cpus: 0.25, pids: 32 },
    env: {},
  });
  if (res.status !== 201) throw new Error(`no se pudo crear la sesión canario: ${res.status} ${await res.text()}`);
  sessions.push(sid);
  return sid;
}

let failures = 0;
const check = (name, pass, detail = "") => {
  if (!pass) failures++;
  console.log(`${pass ? "✓" : "✗"} ${name}${pass ? "" : `  <-- ${detail}`}`);
};

try {
  const a = await start();
  const b = await start();
  const r = await viaGateway(a, "/report");

  console.log("\n# Endurecimiento del contenedor");
  check("no corre como root", r.identity.uid !== 0, `uid=${r.identity.uid}`);
  check("sin capabilities (CapEff = 0)", /^0+$/.test(r.proc.CapEff), r.proc.CapEff);
  check("no-new-privileges activo", r.proc.NoNewPrivs === "1", r.proc.NoNewPrivs);
  check("sistema de archivos raíz de solo lectura", r.fs.rootWritable === false);
  check("/tmp escribible (tmpfs) para el reto", r.fs.tmpWritable === true);

  console.log("\n# Sin salida a Internet");
  check("TCP a 1.1.1.1:443 bloqueado", r.network.internet.cloudflare443 === false);
  check("TCP a 8.8.8.8:53 bloqueado", r.network.internet.google53 === false);
  check("DNS externo no resuelve", r.network.internet.dnsResolves === false);

  console.log("\n# Sin acceso al host");
  for (const [k, v] of Object.entries(r.network.host)) check(`${k} inalcanzable`, v === false);

  console.log("\n# Sin acceso a la plataforma");
  for (const k of ["db", "app", "orchestrator", "dockerproxy"]) check(`${k} inalcanzable`, r.network.platform[k] === false);
  const adminStatus = r.network.platform.gatewayAdminStatus;
  check("API admin del gateway rechaza al reto (403/401/sin conexión)", adminStatus === null || adminStatus === 403 || adminStatus === 401, `status=${adminStatus}`);

  console.log("\n# Aislamiento entre sesiones");
  const peer = await viaGateway(a, `/probe?host=cl-${b}&port=8080`);
  check("la sesión A no alcanza a la sesión B (por nombre)", peer.reachable === false);
} finally {
  for (const sid of sessions) await orch("DELETE", `/sessions/${sid}`).catch(() => {});
}

console.log(failures ? `\n${failures} comprobación(es) fallaron` : "\nAislamiento verificado ✔");
process.exit(failures ? 1 : 0);
