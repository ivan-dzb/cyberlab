// Comprueba que cada reto es RESOLUBLE: inicia una sesión real, ejecuta challenges/<slug>/solve.mjs
// (la solución de referencia) y verifica que obtiene exactamente la bandera inyectada en esa sesión.
// Ejecutar dentro del contenedor app: docker compose exec app npm run test:challenges [slug]
// Requiere las imágenes construidas (npm run build:challenges en el host).
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "challenges");
const ORCH = process.env.ORCH_URL;
const TOKEN = process.env.ORCH_TOKEN;
const GATEWAY = new URL(process.env.GATEWAY_PUBLIC_URL ?? "http://gateway:8081");
const only = process.argv[2];
if (!ORCH || !TOKEN) {
  console.error("ORCH_URL y ORCH_TOKEN son obligatorios");
  process.exit(2);
}

const orch = (method, p, body) =>
  fetch(ORCH + p, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

/** Cliente HTTP hacia el reto vía gateway (Host = <sid>.lab.test). No sigue redirecciones. */
function makeRequest(sid) {
  return (p, { method = "GET", headers = {}, body } = {}) =>
    new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: GATEWAY.hostname, port: GATEWAY.port, path: p, method, headers: { host: `${sid}.lab.test`, ...headers }, timeout: 20_000 },
        (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, text: Buffer.concat(chunks).toString("utf8") }));
        },
      );
      req.on("timeout", () => req.destroy(new Error("timeout")));
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    });
}

async function waitReady(request) {
  for (let i = 0; i < 30; i++) {
    try {
      // 502 = el gateway aún no logra conectar con el contenedor (arranque).
      const res = await request("/");
      if (![502, 503].includes(res.status) || i >= 29) return;
    } catch {
      // reintentar
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("el reto no respondió");
}

const withTimeout = (p, ms) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`solve.mjs superó ${ms / 1000}s`)), ms))]);

let failures = 0;
let ran = 0;

for (const dir of readdirSync(root, { withFileTypes: true })) {
  if (!dir.isDirectory() || dir.name.startsWith("_") || (only && dir.name !== only)) continue;
  const base = path.join(root, dir.name);
  const solvePath = path.join(base, "solve.mjs");
  if (!existsSync(solvePath)) {
    console.log(`✗ ${dir.name}: falta solve.mjs`);
    failures++;
    continue;
  }
  const meta = JSON.parse(readFileSync(path.join(base, "challenge.json"), "utf8"));
  const sid = randomUUID();
  const flag = `CYBERLAB{test-${randomBytes(8).toString("hex")}}`;
  ran++;
  try {
    const res = await orch("POST", "/sessions", { sid, image: meta.imagen_docker, port: meta.puerto, limits: meta.limites, env: { FLAG: flag } });
    if (res.status !== 201) throw new Error(`no se pudo iniciar: ${res.status} ${await res.text()}`);
    const request = makeRequest(sid);
    await waitReady(request);
    const { default: solve } = await import(pathToFileURL(solvePath).href);
    const found = await withTimeout(solve({ request }), 90_000);
    if (found === flag) console.log(`✓ ${dir.name}`);
    else {
      console.log(`✗ ${dir.name}: la solución devolvió ${JSON.stringify(found)} y se esperaba la bandera de la sesión`);
      failures++;
    }
  } catch (err) {
    console.log(`✗ ${dir.name}: ${err.message}`);
    failures++;
  } finally {
    await orch("DELETE", `/sessions/${sid}`).catch(() => {});
  }
}

if (ran === 0 && failures === 0) console.log("No hay retos con solve.mjs para probar");
console.log(failures ? `\n${failures} reto(s) con problemas` : `\nTodos los retos son resolubles (${ran}) ✔`);
process.exit(failures ? 1 : 0);
