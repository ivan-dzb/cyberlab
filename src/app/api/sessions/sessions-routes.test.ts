import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ctx, jsonRequest } from "../../../../tests/helpers";

const m = vi.hoisted(() => ({
  query: vi.fn(),
  enforce: vi.fn(),
  getCurrentUser: vi.fn(),
  createContainerSession: vi.fn(),
  destroyContainerSession: vi.fn(),
  logSessionEvent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ query: m.query }));
vi.mock("@/lib/rate-limit", () => ({ enforce: m.enforce }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: m.getCurrentUser }));
vi.mock("@/lib/session-events", () => ({ logSessionEvent: m.logSessionEvent }));
vi.mock("@/lib/orchestrator", () => ({
  createContainerSession: m.createContainerSession,
  destroyContainerSession: m.destroyContainerSession,
  sessionUrl: (sid: string) => `http://${sid}.lab.localhost:8081`,
}));

import { DELETE } from "./[id]/route";
import { POST as extend } from "./[id]/extend/route";
import { GET, POST } from "./route";

const url = "http://localhost:3000/api/sessions";
const SID = "3deec807-d5fd-477a-84e0-f4dfff5c6ada";

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset();
  m.enforce.mockResolvedValue(null);
  m.getCurrentUser.mockResolvedValue({ id: "u1", email: "a@b.co" });
  m.createContainerSession.mockResolvedValue({ containerId: "cont-1" });
  m.destroyContainerSession.mockResolvedValue(undefined);
  m.logSessionEvent.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/sessions", () => {
  it("401 sin sesión", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });
  it("session: null si no hay ninguna activa", async () => {
    m.query.mockResolvedValue([]);
    expect(await (await GET()).json()).toEqual({ session: null });
  });
  it("devuelve mi sesión activa con su URL de origen propio", async () => {
    m.query.mockResolvedValue([{ id: SID, slug: "bienvenida", expira_en: new Date("2026-10-19T13:00:00Z") }]);
    const body = await (await GET()).json();
    expect(body.session).toMatchObject({ id: SID, slug: "bienvenida", url: `http://${SID}.lab.localhost:8081` });
    const [sql, params] = m.query.mock.calls[0];
    expect(sql).toContain("estado = 'activa' AND s.expira_en > now()");
    expect(params).toEqual(["u1"]);
  });
});

describe("POST /api/sessions", () => {
  const challenge = { id: "c1", imagen_docker: "cyberlab/bienvenida:latest", puerto: 8080, limites: { memoria_mb: 64, timeout_inactividad_min: 45 } };
  const post = (body: unknown) => POST(jsonRequest(url, body));

  it("401 sin sesión / 400 sin JSON / 400 slug inválido", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    expect((await post({ slug: "x" })).status).toBe(401);
    m.getCurrentUser.mockResolvedValue({ id: "u1" });
    expect((await POST(new Request(url, { method: "POST", body: "x" }))).status).toBe(400);
    for (const slug of ["../x", "UPPER", "", "a b"]) expect((await post({ slug })).status, slug).toBe(400);
  });

  it("429 si se supera el límite de creación (10/h)", async () => {
    m.enforce.mockResolvedValue(new Response("{}", { status: 429 }));
    expect((await post({ slug: "bienvenida" })).status).toBe(429);
    expect(m.enforce.mock.calls[0][0][0]).toMatchObject({ name: "session-create", subject: "u1", max: 10, windowSec: 3600 });
    expect(m.createContainerSession).not.toHaveBeenCalled();
  });

  it("404 si el reto no existe o no es visible", async () => {
    m.query.mockResolvedValueOnce([]);
    const res = await post({ slug: "no-existe" });
    expect(res.status).toBe(404);
    expect(m.query.mock.calls[0][0]).toContain("AND visible");
  });

  it("los retos internos (prefijo _) no se pueden iniciar por la API: 400", async () => {
    expect((await post({ slug: "_canary" })).status).toBe(400);
    expect(m.query).not.toHaveBeenCalled();
  });

  it("409 activeSession si el índice único detecta otra sesión activa", async () => {
    m.query.mockResolvedValueOnce([challenge]).mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "23505" }));
    const res = await post({ slug: "bienvenida" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "activeSession" });
    expect(m.createContainerSession).not.toHaveBeenCalled();
  });

  it("500 ante otros errores de BD", async () => {
    m.query.mockResolvedValueOnce([challenge]).mockRejectedValueOnce(new Error("otra"));
    expect((await post({ slug: "bienvenida" })).status).toBe(500);
  });

  it("201: crea la sesión con bandera aleatoria, guarda solo su hash y registra el inicio", async () => {
    m.query.mockResolvedValueOnce([challenge]).mockResolvedValue([]);
    const res = await post({ slug: "bienvenida" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.url).toBe(`http://${body.id}.lab.localhost:8081`);

    const input = m.createContainerSession.mock.calls[0][0];
    expect(input).toMatchObject({ sid: body.id, image: "cyberlab/bienvenida:latest", port: 8080 });
    expect(input.env.FLAG).toMatch(/^CYBERLAB\{[0-9a-f]{24}\}$/);

    const insert = m.query.mock.calls[1];
    expect(insert[0]).toContain("INSERT INTO container_session");
    expect(insert[1][4]).toBe(createHash("sha256").update(input.env.FLAG).digest("hex"));
    expect(insert[1][3]).toBe(45); // timeout de inactividad del reto
    expect(JSON.stringify(m.query.mock.calls)).not.toContain(input.env.FLAG);

    expect(m.query.mock.calls[2][0]).toContain("estado = 'activa'");
    expect(m.logSessionEvent).toHaveBeenCalledWith(body.id, "u1", "inicio", { reto: "bienvenida" });
  });

  it("cada sesión recibe una bandera distinta", async () => {
    m.query.mockResolvedValueOnce([challenge]).mockResolvedValue([]);
    await post({ slug: "bienvenida" });
    m.query.mockResolvedValueOnce([challenge]).mockResolvedValue([]);
    await post({ slug: "bienvenida" });
    const flags = m.createContainerSession.mock.calls.map((c) => c[0].env.FLAG);
    expect(new Set(flags).size).toBe(2);
  });

  it("502 y estado 'error' si el orquestador falla; registra el error", async () => {
    m.query.mockResolvedValueOnce([challenge]).mockResolvedValue([]);
    m.createContainerSession.mockRejectedValue(new Error("docker caído"));
    const res = await post({ slug: "bienvenida" });
    expect(res.status).toBe(502);
    expect(m.query.mock.calls.some((c) => String(c[0]).includes("estado = 'error'"))).toBe(true);
    expect(m.logSessionEvent).toHaveBeenCalledWith(expect.any(String), "u1", "error", expect.objectContaining({ fase: "crear" }));
  });
});

describe("DELETE /api/sessions/:id", () => {
  const del = (id: string) => DELETE(jsonRequest(`${url}/${id}`, {}, { method: "DELETE" }), ctx({ id }));

  it("401 / 400 / 404 uuid inválido", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    expect((await del(SID)).status).toBe(401);
    m.getCurrentUser.mockResolvedValue({ id: "u1" });
    expect((await DELETE(new Request(url, { method: "DELETE" }), ctx({ id: SID }))).status).toBe(400);
    expect((await del("no-es-uuid")).status).toBe(404);
    expect(m.query).not.toHaveBeenCalled();
  });

  it("404 si la sesión no es mía (sin revelar si existe)", async () => {
    m.query.mockResolvedValue([]);
    expect((await del(SID)).status).toBe(404);
    expect(m.query.mock.calls[0][1]).toEqual([SID, "u1"]);
    expect(m.destroyContainerSession).not.toHaveBeenCalled();
  });

  it("200: destruye, marca terminada y registra 'fin'", async () => {
    m.query.mockResolvedValueOnce([{ id: SID }]).mockResolvedValue([]);
    expect((await del(SID)).status).toBe(200);
    expect(m.destroyContainerSession).toHaveBeenCalledWith(SID);
    expect(m.query.mock.calls[1][0]).toContain("estado = 'terminada'");
    expect(m.logSessionEvent).toHaveBeenCalledWith(SID, "u1", "fin");
  });

  it("502 y no marca terminada si el orquestador falla", async () => {
    m.query.mockResolvedValueOnce([{ id: SID }]);
    m.destroyContainerSession.mockRejectedValue(new Error("x"));
    expect((await del(SID)).status).toBe(502);
    expect(m.query).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/sessions/:id/extend", () => {
  const ext = (id: string) => extend(jsonRequest(`${url}/${id}/extend`, {}), ctx({ id }));

  it("401 / 400 / 404", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    expect((await ext(SID)).status).toBe(401);
    m.getCurrentUser.mockResolvedValue({ id: "u1" });
    expect((await extend(new Request(url, { method: "POST" }), ctx({ id: SID }))).status).toBe(400);
    expect((await ext("xx")).status).toBe(404);
  });

  it("404 si no es mía, no está activa o ya venció", async () => {
    m.query.mockResolvedValue([]);
    expect((await ext(SID)).status).toBe(404);
    const [sql, params] = m.query.mock.calls[0];
    expect(sql).toContain("user_id = $2 AND estado = 'activa' AND expira_en > now()");
    expect(params).toEqual([SID, "u1", 30, 120]);
  });

  it("200: devuelve la nueva expiración (tope 2 h en SQL) y registra 'extension'", async () => {
    m.query.mockResolvedValue([{ expira_en: new Date("2026-10-19T13:00:00Z") }]);
    const res = await ext(SID);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ expiresAt: "2026-10-19T13:00:00.000Z" });
    expect(m.query.mock.calls[0][0]).toContain("LEAST(");
    expect(m.logSessionEvent).toHaveBeenCalledWith(SID, "u1", "extension");
  });
});
