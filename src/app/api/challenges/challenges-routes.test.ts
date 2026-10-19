import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ctx, jsonRequest } from "../../../../tests/helpers";

const m = vi.hoisted(() => ({
  query: vi.fn(),
  enforce: vi.fn(),
  getCurrentUser: vi.fn(),
  getHints: vi.fn(),
  logSessionEvent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ query: m.query }));
vi.mock("@/lib/rate-limit", () => ({ enforce: m.enforce }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: m.getCurrentUser }));
vi.mock("@/lib/hints", () => ({ getHints: m.getHints }));
vi.mock("@/lib/session-events", () => ({ logSessionEvent: m.logSessionEvent }));

import { POST as flag } from "./[slug]/flag/route";
import { GET as hints } from "./[slug]/hints/route";
import { POST as unlock } from "./[slug]/hints/unlock/route";
import { GET as status } from "./[slug]/status/route";

const base = "http://localhost:3000/api/challenges/bienvenida";
const FLAG = "CYBERLAB{abc123}";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset();
  m.enforce.mockResolvedValue(null);
  m.getCurrentUser.mockResolvedValue({ id: "u1", email: "a@b.co" });
  m.logSessionEvent.mockResolvedValue(undefined);
});

describe("POST /api/challenges/:slug/flag", () => {
  const send = (body: unknown, slug = "bienvenida") => flag(jsonRequest(`${base}/flag`, body), ctx({ slug }));
  const session = { session_id: "s1", flag_hash: sha(FLAG), challenge_id: "c1", xp: 50 };

  it("401 sin sesión / 400 sin JSON / 400 entrada inválida", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    expect((await send({ flag: FLAG })).status).toBe(401);
    m.getCurrentUser.mockResolvedValue({ id: "u1" });
    expect((await flag(new Request(`${base}/flag`, { method: "POST", body: "x" }), ctx({ slug: "bienvenida" }))).status).toBe(400);
    expect((await send({ flag: "" })).status).toBe(400);
    expect((await send({ flag: "x".repeat(201) })).status).toBe(400);
    expect((await send({})).status).toBe(400);
    expect((await send({ flag: FLAG }, "../x")).status).toBe(400);
  });

  it("429 por fuerza bruta de la bandera (20 por 10 min)", async () => {
    m.enforce.mockResolvedValue(new Response("{}", { status: 429 }));
    expect((await send({ flag: FLAG })).status).toBe(429);
    expect(m.enforce.mock.calls[0][0][0]).toMatchObject({ name: "flag-user", subject: "u1", max: 20, windowSec: 600 });
  });

  it("404 noSession si no tengo una sesión activa de ese reto", async () => {
    m.query.mockResolvedValue([]);
    const res = await send({ flag: FLAG });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "noSession" });
    const [sql, params] = m.query.mock.calls[0];
    expect(sql).toContain("s.user_id = $1");
    expect(sql).toContain("s.estado = 'activa' AND s.expira_en > now()");
    expect(params).toEqual(["u1", "bienvenida"]);
  });

  it("bandera incorrecta: correct=false y no se escribe progreso", async () => {
    m.query.mockResolvedValue([session]);
    const res = await send({ flag: "CYBERLAB{otra}" });
    expect(await res.json()).toEqual({ correct: false });
    expect(m.query).toHaveBeenCalledTimes(1);
    expect(m.logSessionEvent).not.toHaveBeenCalled();
  });

  it("la bandera de otra sesión/usuario no vale (se compara con el hash de MI sesión)", async () => {
    m.query.mockResolvedValue([{ ...session, flag_hash: sha("CYBERLAB{de-otro}") }]);
    expect((await (await send({ flag: FLAG })).json()).correct).toBe(false);
  });

  it("acepta la bandera con espacios alrededor (trim)", async () => {
    m.query.mockResolvedValueOnce([session]).mockResolvedValue([]);
    expect((await (await send({ flag: `  ${FLAG}  ` })).json()).correct).toBe(true);
  });

  it("correcta sin pistas: otorga el XP completo y registra el evento", async () => {
    m.query.mockResolvedValueOnce([session]).mockResolvedValueOnce([]).mockResolvedValue([]);
    const res = await send({ flag: FLAG });
    expect(await res.json()).toEqual({ correct: true, already: false, xp: 50 });
    const insert = m.query.mock.calls[2];
    expect(insert[0]).toContain("INSERT INTO user_progress");
    expect(insert[0]).toContain("WHERE user_progress.estado <> 'completado'");
    expect(insert[1]).toEqual(["u1", "c1", 50]);
    expect(m.logSessionEvent).toHaveBeenCalledWith("s1", "u1", "bandera_ok", { xp: 50 });
  });

  it("con 2 pistas usadas otorga el 60 %", async () => {
    m.query.mockResolvedValueOnce([session]).mockResolvedValueOnce([{ estado: "en_progreso", pistas_usadas: 2 }]).mockResolvedValue([]);
    expect(await (await send({ flag: FLAG })).json()).toEqual({ correct: true, already: false, xp: 30 });
  });

  it("ya completado: correct=true, already=true, 0 XP y sin escribir de nuevo", async () => {
    m.query.mockResolvedValueOnce([session]).mockResolvedValueOnce([{ estado: "completado", pistas_usadas: 0 }]);
    expect(await (await send({ flag: FLAG })).json()).toEqual({ correct: true, already: true, xp: 0 });
    expect(m.query).toHaveBeenCalledTimes(2);
    expect(m.logSessionEvent).not.toHaveBeenCalled();
  });
});

describe("GET /api/challenges/:slug/status", () => {
  const get = (slug = "bienvenida") => status(new Request(`${base}/status`), ctx({ slug }));

  it("401 / 400", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    m.getCurrentUser.mockResolvedValue({ id: "u1" });
    expect((await get("../x")).status).toBe(400);
  });
  it("sin progreso: no completado, 0 XP, 0 pistas", async () => {
    m.query.mockResolvedValue([]);
    expect(await (await get()).json()).toEqual({ completed: false, xp: 0, hintsUsed: 0 });
  });
  it("con progreso completado", async () => {
    m.query.mockResolvedValue([{ estado: "completado", xp_otorgado: 40, pistas_usadas: 1 }]);
    expect(await (await get()).json()).toEqual({ completed: true, xp: 40, hintsUsed: 1 });
    expect(m.query.mock.calls[0][1]).toEqual(["u1", "bienvenida"]);
  });
  it("en progreso no cuenta como completado", async () => {
    m.query.mockResolvedValue([{ estado: "en_progreso", xp_otorgado: 0, pistas_usadas: 2 }]);
    expect((await (await get()).json()).completed).toBe(false);
  });
});

describe("GET /api/challenges/:slug/hints", () => {
  const get = (qs = "", slug = "bienvenida") => hints(new Request(`${base}/hints${qs}`), ctx({ slug }));

  it("401 / 400 / 404", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
    m.getCurrentUser.mockResolvedValue({ id: "u1" });
    expect((await get("", "../x")).status).toBe(400);
    m.getHints.mockResolvedValue(null);
    expect((await get()).status).toBe(404);
  });
  it("pasa el idioma validado (cae a es si es desconocido)", async () => {
    m.getHints.mockResolvedValue({ total: 3, unlocked: 0, hints: [], completed: false });
    await get("?locale=en");
    expect(m.getHints).toHaveBeenLastCalledWith("u1", "bienvenida", "en");
    await get("?locale=fr");
    expect(m.getHints).toHaveBeenLastCalledWith("u1", "bienvenida", "es");
    await get("?locale=es;drop");
    expect(m.getHints).toHaveBeenLastCalledWith("u1", "bienvenida", "es");
  });
});

describe("POST /api/challenges/:slug/hints/unlock", () => {
  const post = (body: unknown = {}, slug = "bienvenida") => unlock(jsonRequest(`${base}/hints/unlock`, body), ctx({ slug }));
  const state = (unlocked: number, completed = false) => ({ total: 3, unlocked, hints: Array(unlocked).fill("h"), completed });

  it("401 / 400 / 404 / 429", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    expect((await post()).status).toBe(401);
    m.getCurrentUser.mockResolvedValue({ id: "u1" });
    expect((await unlock(new Request(`${base}/hints/unlock`, { method: "POST" }), ctx({ slug: "bienvenida" }))).status).toBe(400);
    expect((await post({}, "../x")).status).toBe(400);
    m.enforce.mockResolvedValue(new Response("{}", { status: 429 }));
    expect((await post()).status).toBe(429);
    m.enforce.mockResolvedValue(null);
    m.getHints.mockResolvedValue(null);
    expect((await post()).status).toBe(404);
  });

  it("409 si el reto ya está completado (no hay penalización inútil)", async () => {
    m.getHints.mockResolvedValue(state(1, true));
    const res = await post();
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "alreadyCompleted" });
    expect(m.query).not.toHaveBeenCalled();
  });

  it("si ya están todas desbloqueadas, devuelve el estado sin escribir", async () => {
    m.getHints.mockResolvedValue(state(3));
    expect((await (await post()).json()).unlocked).toBe(3);
    expect(m.query).not.toHaveBeenCalled();
  });

  it("desbloquea la siguiente con un UPSERT atómico acotado al total", async () => {
    m.getHints.mockResolvedValueOnce(state(1)).mockResolvedValueOnce(state(2));
    m.query.mockResolvedValue([]);
    const res = await post({ locale: "en" });
    expect((await res.json()).unlocked).toBe(2);
    const [sql, params] = m.query.mock.calls[0];
    expect(sql).toContain("pistas_usadas = user_progress.pistas_usadas + 1");
    expect(sql).toContain("user_progress.pistas_usadas < $3");
    expect(sql).toContain("user_progress.estado <> 'completado'");
    expect(params).toEqual(["u1", "bienvenida", 3]);
  });
});
