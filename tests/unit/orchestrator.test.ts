import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fakeServer, freePort, rawRequest, startProc, type Proc, type Recorded } from "../proc";

const TOKEN = "o".repeat(64);
const GW_TOKEN = "g".repeat(64);
const SID = "3deec807-d5fd-477a-84e0-f4dfff5c6ada";

type Docker = Awaited<ReturnType<typeof fakeServer>>;
let docker: Docker;
let gateway: Docker;
let proc: Proc;
let port: number;
let dockerOverride: (r: Recorded) => { status: number; body?: unknown } | undefined = () => undefined;

function dockerDefault(r: Recorded): { status: number; body?: unknown } {
  const o = dockerOverride(r);
  if (o) return o;
  if (r.method === "POST" && r.url === "/networks/create") return { status: 201, body: { Id: "net1" } };
  if (r.method === "POST" && r.url.startsWith("/containers/create")) return { status: 201, body: { Id: "cid-123" } };
  if (r.method === "POST" && /\/containers\/.+\/start$/.test(r.url)) return { status: 204 };
  if (r.method === "POST" && /\/networks\/.+\/(connect|disconnect)$/.test(r.url)) return { status: 200, body: {} };
  if (r.method === "DELETE") return { status: 204 };
  if (r.method === "GET" && r.url.startsWith("/containers/json")) {
    return { status: 200, body: [{ Labels: { "cyberlab.session": SID }, State: "running", Created: 1700000000 }] };
  }
  return { status: 404, body: { message: "no mock" } };
}

beforeAll(async () => {
  docker = await fakeServer(dockerDefault);
  gateway = await fakeServer((r) => (r.url === "/routes" ? { status: 200, body: { routes: [{ sid: SID, lastSeen: 1, hits: 7 }] } } : { status: 200, body: { ok: true } }));
  port = await freePort();
  proc = await startProc(
    "orchestrator/server.js",
    { DOCKER_URL: docker.url, GATEWAY_URL: gateway.url, ORCH_TOKEN: TOKEN, GATEWAY_TOKEN: GW_TOKEN, PORT: String(port), GATEWAY_CONTAINER: "cyberlab-gateway" },
    "orchestrator listening",
  );
});

afterAll(async () => {
  await proc.stop();
  await docker.close();
  await gateway.close();
});

beforeEach(() => {
  docker.calls.length = 0;
  gateway.calls.length = 0;
  dockerOverride = () => undefined;
});

const call = (method: string, path: string, body?: unknown, token: string | null = TOKEN) =>
  rawRequest({
    port,
    method,
    path,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

const valid = { sid: SID, image: "cyberlab/bienvenida:latest", port: 8080, limits: { memoria_mb: 64, cpus: 0.25, pids: 32 }, env: { FLAG: "CYBERLAB{x}" } };
const createBody = () => docker.calls.find((c) => c.url.startsWith("/containers/create"))!.body as Record<string, any>;

describe("arranque", () => {
  it("se niega a arrancar con tokens débiles (< 32 caracteres)", async () => {
    const p = await startProc("orchestrator/server.js", { ORCH_TOKEN: "corto", GATEWAY_TOKEN: GW_TOKEN, PORT: String(await freePort()) });
    expect(await p.exited).toBe(1);
    expect(p.output()).toMatch(/al menos 32 caracteres/);
  });
});

describe("autenticación", () => {
  it("/health responde sin autenticar", async () => {
    expect((await call("GET", "/health", undefined, null)).status).toBe(200);
  });
  it.each([
    ["sin token", null],
    ["token incorrecto de la misma longitud", "x".repeat(64)],
    ["token de otra longitud", "corto"],
  ])("401 %s", async (_n, token) => {
    expect((await call("GET", "/sessions", undefined, token)).status).toBe(401);
    expect((await call("POST", "/sessions", valid, token)).status).toBe(401);
    expect((await call("DELETE", `/sessions/${SID}`, undefined, token)).status).toBe(401);
    expect(docker.calls).toHaveLength(0); // sin credencial no se toca Docker
  });
  it("404 para rutas desconocidas (autenticado)", async () => {
    expect((await call("GET", "/nada")).status).toBe(404);
  });
});

describe("POST /sessions: política de aislamiento", () => {
  it("201 y crea red + contenedor + arranque + conexión del gateway + ruta, en ese orden", async () => {
    const res = await call("POST", "/sessions", valid);
    expect(res.status).toBe(201);
    expect(JSON.parse(res.text)).toEqual({ containerId: "cid-123", network: `cyberlab-s-${SID}` });
    expect(docker.calls.map((c) => `${c.method} ${c.url.split("?")[0].replace(SID, "<sid>")}`)).toEqual([
      "POST /networks/create",
      "POST /containers/create",
      "POST /containers/cl-<sid>/start",
      "POST /networks/cyberlab-s-<sid>/connect",
    ]);
    expect(gateway.calls[0]).toMatchObject({ method: "PUT", url: `/routes/${SID}`, body: { upstream: `http://cl-${SID}:8080` } });
    expect(gateway.calls[0].headers.authorization).toBe(`Bearer ${GW_TOKEN}`);
  });

  it("la red de la sesión es interna (sin Internet, sin host, sin otras sesiones)", async () => {
    await call("POST", "/sessions", valid);
    const net = docker.calls.find((c) => c.url === "/networks/create")!.body as Record<string, any>;
    expect(net).toMatchObject({ Name: `cyberlab-s-${SID}`, Driver: "bridge", Internal: true });
    expect(net.Labels).toMatchObject({ "cyberlab.managed": "true", "cyberlab.session": SID });
  });

  it("el contenedor se endurece: no-root, FS de solo lectura, sin capabilities, sin privilegios", async () => {
    await call("POST", "/sessions", valid);
    const b = createBody();
    expect(b.Image).toBe("cyberlab/bienvenida:latest");
    expect(b.User).toBe("65534:65534");
    expect(b.Env).toEqual(["FLAG=CYBERLAB{x}"]);
    expect(b.HostConfig).toMatchObject({
      NetworkMode: `cyberlab-s-${SID}`,
      Privileged: false,
      ReadonlyRootfs: true,
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges:true"],
      PublishAllPorts: false,
      RestartPolicy: { Name: "no" },
      Dns: [],
    });
    expect(b.HostConfig.Tmpfs["/tmp"]).toContain("noexec");
    expect(b.HostConfig.CapAdd).toBeUndefined();
    expect(b.HostConfig.PortBindings).toBeUndefined();
    expect(b.HostConfig.Binds).toBeUndefined();
    expect(b.HostConfig.Ulimits).toEqual([{ Name: "nofile", Soft: 256, Hard: 256 }]);
  });

  it("aplica memoria (sin swap), CPU y pids del reto", async () => {
    await call("POST", "/sessions", valid);
    const h = createBody().HostConfig;
    expect(h.Memory).toBe(64 * 1024 * 1024);
    expect(h.MemorySwap).toBe(h.Memory);
    expect(h.NanoCpus).toBe(250_000_000);
    expect(h.PidsLimit).toBe(32);
  });

  it("ignora cualquier opción de aislamiento que venga en la petición (la política es del orquestador)", async () => {
    await call("POST", "/sessions", {
      ...valid,
      User: "root",
      Privileged: true,
      HostConfig: { Privileged: true, Binds: ["/:/host"], NetworkMode: "host", CapAdd: ["SYS_ADMIN"], PidMode: "host" },
      privileged: true,
      network_mode: "host",
      binds: ["/var/run/docker.sock:/var/run/docker.sock"],
    });
    const b = createBody();
    expect(b.User).toBe("65534:65534");
    expect(b.HostConfig.Privileged).toBe(false);
    expect(b.HostConfig.NetworkMode).toBe(`cyberlab-s-${SID}`);
    expect(JSON.stringify(b)).not.toMatch(/docker\.sock|SYS_ADMIN|"host"|\/:\/host/);
  });

  it("acota los límites a valores seguros", async () => {
    await call("POST", "/sessions", { ...valid, limits: { memoria_mb: 99999, cpus: 50, pids: 100000 } });
    let h = createBody().HostConfig;
    expect(h.Memory).toBe(1024 * 1024 * 1024);
    expect(h.NanoCpus).toBe(2_000_000_000);
    expect(h.PidsLimit).toBe(512);

    docker.calls.length = 0;
    await call("POST", "/sessions", { ...valid, sid: "11111111-1111-1111-1111-111111111111", limits: { memoria_mb: 1, cpus: 0, pids: 1 } });
    h = createBody().HostConfig;
    expect(h.Memory).toBe(16 * 1024 * 1024);
    expect(h.NanoCpus).toBe(100_000_000);
    expect(h.PidsLimit).toBe(16);
  });

  it("usa valores por defecto razonables si no se indican límites", async () => {
    await call("POST", "/sessions", { sid: SID, image: "cyberlab/x:1", port: 8080 });
    const h = createBody().HostConfig;
    expect(h.Memory).toBe(128 * 1024 * 1024);
    expect(h.NanoCpus).toBe(250_000_000);
    expect(h.PidsLimit).toBe(64);
  });

  it.each([
    ["sid con formato inválido", { ...valid, sid: "no-es-uuid" }],
    ["sid con path traversal", { ...valid, sid: "../../etc/passwd" }],
    ["imagen fuera de cyberlab/", { ...valid, image: "alpine:latest" }],
    ["imagen con prefijo engañoso", { ...valid, image: "evil/cyberlab/x:1" }],
    ["imagen sin etiqueta", { ...valid, image: "cyberlab/x" }],
    ["imagen con path traversal", { ...valid, image: "cyberlab/../x:1" }],
    ["imagen con registro externo", { ...valid, image: "registry.evil.com/cyberlab/x:1" }],
    ["puerto 0", { ...valid, port: 0 }],
    ["puerto > 65535", { ...valid, port: 70000 }],
    ["puerto como texto", { ...valid, port: "8080" }],
    ["variable de entorno en minúsculas", { ...valid, env: { flag: "x" } }],
    ["variable de entorno con caracteres raros", { ...valid, env: { "A=B": "x" } }],
    ["valor de entorno no string", { ...valid, env: { FLAG: 123 } }],
    ["valor de entorno enorme", { ...valid, env: { FLAG: "x".repeat(300) } }],
  ])("400 y sin tocar Docker: %s", async (_n, body) => {
    const res = await call("POST", "/sessions", body);
    expect(res.status).toBe(400);
    expect(docker.calls).toHaveLength(0);
  });

  it("400 con JSON inválido y 413 con cuerpo excesivo", async () => {
    expect((await call("POST", "/sessions", "{no es json")).status).toBe(400);
    expect((await call("POST", "/sessions", JSON.stringify({ ...valid, junk: "x".repeat(20_000) }))).status).toBe(413);
    expect(docker.calls).toHaveLength(0);
  });

  it("si Docker falla a mitad: 500 genérico (sin filtrar detalles) y limpia todo lo creado", async () => {
    dockerOverride = (r) => (/\/containers\/.+\/start$/.test(r.url) ? { status: 500, body: { message: "secreto interno del demonio" } } : undefined);
    const res = await call("POST", "/sessions", valid);
    expect(res.status).toBe(500);
    expect(res.text).not.toContain("secreto interno");
    expect(JSON.parse(res.text)).toEqual({ error: "internal error" });
    const urls = docker.calls.map((c) => `${c.method} ${c.url.split("?")[0].replace(SID, "<sid>")}`);
    expect(urls).toContain("DELETE /containers/cl-<sid>");
    expect(urls).toContain("DELETE /networks/cyberlab-s-<sid>");
    expect(gateway.calls.some((c) => c.method === "DELETE" && c.url === `/routes/${SID}`)).toBe(true);
  });
});

describe("DELETE /sessions/:sid", () => {
  it("quita la ruta, desconecta el gateway (forzado), borra contenedor (con volúmenes) y red", async () => {
    const res = await call("DELETE", `/sessions/${SID}`);
    expect(res.status).toBe(200);
    expect(gateway.calls[0]).toMatchObject({ method: "DELETE", url: `/routes/${SID}` });
    expect(docker.calls.map((c) => `${c.method} ${c.url.replace(SID, "<sid>")}`)).toEqual([
      "POST /networks/cyberlab-s-<sid>/disconnect",
      "DELETE /containers/cl-<sid>?force=true&v=true",
      "DELETE /networks/cyberlab-s-<sid>",
    ]);
    expect(docker.calls[0].body).toEqual({ Container: "cyberlab-gateway", Force: true });
  });

  it("es idempotente: recursos ya inexistentes (404) no son error", async () => {
    dockerOverride = () => ({ status: 404, body: { message: "no such" } });
    expect((await call("DELETE", `/sessions/${SID}`)).status).toBe(200);
  });

  it("400 con sid inválido y no toca Docker", async () => {
    expect((await call("DELETE", "/sessions/no-es-uuid")).status).toBe(400);
    expect(docker.calls).toHaveLength(0);
  });
});

describe("GET /sessions y /activity", () => {
  it("lista solo contenedores gestionados (filtro por etiqueta) y devuelve sid/estado/fecha", async () => {
    const res = await call("GET", "/sessions");
    expect(JSON.parse(res.text)).toEqual({ sessions: [{ sid: SID, state: "running", created: 1700000000 }] });
    const url = decodeURIComponent(docker.calls[0].url);
    expect(url).toContain("all=true");
    expect(url).toContain("cyberlab.managed=true");
  });

  it("/activity reenvía la actividad del gateway (con su token)", async () => {
    const res = await call("GET", "/activity");
    expect(JSON.parse(res.text)).toEqual({ activity: [{ sid: SID, lastSeen: 1, hits: 7 }] });
    expect(gateway.calls[0].headers.authorization).toBe(`Bearer ${GW_TOKEN}`);
  });
});
