import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { freePort, rawRequest, startProc, type Proc } from "../proc";

const TOKEN = "g".repeat(64);
const SID = "3deec807-d5fd-477a-84e0-f4dfff5c6ada";
const OTHER = "11111111-1111-1111-1111-111111111111";

let proc: Proc;
let publicPort: number;
let adminPort: number;

beforeAll(async () => {
  publicPort = await freePort();
  adminPort = await freePort();
  proc = await startProc(
    "gateway/server.js",
    { GATEWAY_TOKEN: TOKEN, PUBLIC_PORT: String(publicPort), ADMIN_PORT: String(adminPort), ADMIN_ALLOWED_HOST: "localhost" },
    "gateway public on",
  );
});
afterAll(() => proc.stop());

const admin = (method: string, path: string, body?: unknown, token: string | null = TOKEN) =>
  rawRequest({
    port: adminPort,
    method,
    path,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
const pub = (host: string, path = "/") => rawRequest({ port: publicPort, path, headers: { host } });
const routes = async () => JSON.parse((await admin("GET", "/routes")).text).routes as { sid: string; lastSeen: number; hits: number }[];

describe("arranque", () => {
  it("se niega a arrancar con un token débil", async () => {
    const p = await startProc("gateway/server.js", { GATEWAY_TOKEN: "corto", PUBLIC_PORT: String(await freePort()), ADMIN_PORT: String(await freePort()) });
    expect(await p.exited).toBe(1);
    expect(p.output()).toMatch(/al menos 32 caracteres/);
  });
});

describe("API admin: autenticación", () => {
  it.each([
    ["sin token", null],
    ["token incorrecto", "x".repeat(64)],
    ["token de otra longitud", "corto"],
  ])("401 %s", async (_n, token) => {
    expect((await admin("GET", "/routes", undefined, token)).status).toBe(401);
    expect((await admin("PUT", `/routes/${SID}`, { upstream: `http://cl-${SID}:8080` }, token)).status).toBe(401);
  });
});

describe("API admin: solo desde el orquestador (restricción por IP)", () => {
  it("403 si quien llama no es el host permitido, aunque tenga el token", async () => {
    const ap = await freePort();
    const p = await startProc(
      "gateway/server.js",
      { GATEWAY_TOKEN: TOKEN, PUBLIC_PORT: String(await freePort()), ADMIN_PORT: String(ap), ADMIN_ALLOWED_HOST: "no-existe.invalid" },
      "gateway public on",
    );
    const res = await rawRequest({ port: ap, path: "/routes", headers: { authorization: `Bearer ${TOKEN}` } });
    expect(res.status).toBe(403);
    await p.stop();
  });
});

describe("API admin: rutas", () => {
  it("registra, lista (con hits=0) y borra una ruta", async () => {
    expect((await admin("PUT", `/routes/${SID}`, { upstream: `http://cl-${SID}:8080` })).status).toBe(200);
    const list = await routes();
    expect(list.find((r) => r.sid === SID)).toMatchObject({ hits: 0 });
    expect((await admin("DELETE", `/routes/${SID}`)).status).toBe(200);
    expect((await routes()).some((r) => r.sid === SID)).toBe(false);
  });

  it.each([
    ["upstream de otro host (SSRF a metadatos cloud)", { upstream: "http://169.254.169.254" }],
    ["upstream externo", { upstream: "http://evil.com:80" }],
    ["upstream con credenciales", { upstream: `http://user:pass@cl-${SID}:8080` }],
    ["upstream de otra sesión", { upstream: `http://cl-${OTHER}:8080` }],
    ["upstream HTTPS", { upstream: `https://cl-${SID}:8080` }],
    ["upstream sin puerto", { upstream: `http://cl-${SID}` }],
    ["upstream con ruta", { upstream: `http://cl-${SID}:8080/admin` }],
    ["upstream no string", { upstream: 42 }],
    ["sin upstream", {}],
  ])("400: %s", async (_n, body) => {
    expect((await admin("PUT", `/routes/${SID}`, body)).status).toBe(400);
    expect((await routes()).some((r) => r.sid === SID)).toBe(false);
  });

  it("400 con JSON inválido; 404 con sid inválido; 405 con método no soportado", async () => {
    expect((await admin("PUT", `/routes/${SID}`, "{no json")).status).toBe(400);
    expect((await admin("PUT", "/routes/no-es-uuid", { upstream: "http://cl-x:80" })).status).toBe(404);
    expect((await admin("DELETE", "/routes/../../x")).status).toBe(404);
    expect((await admin("POST", `/routes/${SID}`, {})).status).toBe(405);
  });
});

describe("proxy público", () => {
  it("404 para hosts sin ruta, sin subdominio de sesión o con etiqueta que no es UUID", async () => {
    for (const host of [`${SID}.lab.localhost:8081`, "localhost:8081", "admin.lab.localhost", "..lab.localhost", `${SID.toUpperCase()}.lab.localhost`]) {
      const res = await pub(host);
      expect(res.status, host).toBe(404);
      expect(res.text).toMatch(/no encontrada o expirada/i);
    }
  });

  it("enruta por el primer label del Host (con o sin puerto) y cuenta las peticiones", async () => {
    await admin("PUT", `/routes/${SID}`, { upstream: `http://cl-${SID}:8080` });
    // El upstream no resuelve en el entorno de test: el gateway responde 502 sin filtrar detalles.
    const a = await pub(`${SID}.lab.localhost:8081`);
    const b = await pub(`${SID}.lab.test`);
    expect(a.status).toBe(502);
    expect(b.status).toBe(502);
    expect(a.text).toBe("El reto no responde");
    const r = (await routes()).find((x) => x.sid === SID)!;
    expect(r.hits).toBe(2);
    expect(r.lastSeen).toBeGreaterThan(Date.now() - 10_000);
    await admin("DELETE", `/routes/${SID}`);
  });

  it("tras borrar la ruta la sesión deja de existir (404)", async () => {
    await admin("PUT", `/routes/${SID}`, { upstream: `http://cl-${SID}:8080` });
    await admin("DELETE", `/routes/${SID}`);
    expect((await pub(`${SID}.lab.localhost`)).status).toBe(404);
  });

  it("registrar la ruta de una sesión no expone otra (aislamiento entre rutas)", async () => {
    await admin("PUT", `/routes/${SID}`, { upstream: `http://cl-${SID}:8080` });
    expect((await pub(`${OTHER}.lab.localhost`)).status).toBe(404);
    await admin("DELETE", `/routes/${SID}`);
  });
});
