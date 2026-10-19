import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest } from "../../../../tests/helpers";

const m = vi.hoisted(() => ({ query: vi.fn(), enforce: vi.fn(), getCurrentUser: vi.fn(), listModules: vi.fn() }));

vi.mock("@/lib/db", () => ({ query: m.query }));
vi.mock("@/lib/rate-limit", () => ({ enforce: m.enforce }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: m.getCurrentUser }));
vi.mock("@/lib/content", () => ({ listModules: m.listModules }));

import { GET, POST, PUT } from "./route";

const KEY = "m08-conceptos-seguridad/01-triada-cia";
const url = "http://localhost:3000/api/progress";

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset();
  m.enforce.mockResolvedValue(null);
  m.getCurrentUser.mockResolvedValue({ id: "u1", email: "a@b.co" });
  m.query.mockResolvedValue([]);
  m.listModules.mockResolvedValue([{ slug: "m08-conceptos-seguridad", lecciones: [{ slug: "01-triada-cia" }, { slug: "02-riesgo" }] }]);
});

describe("GET /api/progress", () => {
  it("401 sin sesión", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });
  it("devuelve mis claves", async () => {
    m.query.mockResolvedValue([{ k: KEY }]);
    const res = await GET();
    expect(await res.json()).toEqual({ keys: [KEY] });
    expect(m.query.mock.calls[0][1]).toEqual(["u1"]);
  });
});

describe("PUT /api/progress", () => {
  it("401 sin sesión", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    expect((await PUT(jsonRequest(url, { key: KEY, done: true }, { method: "PUT" }))).status).toBe(401);
  });
  it("400 sin JSON (CSRF)", async () => {
    expect((await PUT(new Request(url, { method: "PUT", body: "x" }))).status).toBe(400);
  });
  it.each([
    ["clave con path traversal", { key: "../../etc/passwd", done: true }],
    ["clave sin barra", { key: "solo-una-parte", done: true }],
    ["mayúsculas", { key: "M08/01", done: true }],
    ["done no booleano", { key: KEY, done: "yes" }],
    ["lección inexistente", { key: "m08-conceptos-seguridad/99-nada", done: true }],
    ["módulo inexistente", { key: "nope/01", done: true }],
  ])("400 invalidInput: %s", async (_n, body) => {
    const res = await PUT(jsonRequest(url, body, { method: "PUT" }));
    expect(res.status).toBe(400);
    expect(m.query).not.toHaveBeenCalled();
  });
  it("429 si se supera el límite por usuario", async () => {
    m.enforce.mockResolvedValue(new Response("{}", { status: 429 }));
    expect((await PUT(jsonRequest(url, { key: KEY, done: true }, { method: "PUT" }))).status).toBe(429);
    expect(m.enforce.mock.calls[0][0][0]).toMatchObject({ name: "progress-user", subject: "u1", max: 120, windowSec: 60 });
  });
  it("done=true inserta (idempotente)", async () => {
    const res = await PUT(jsonRequest(url, { key: KEY, done: true }, { method: "PUT" }));
    expect(res.status).toBe(200);
    const [sql, params] = m.query.mock.calls[0];
    expect(sql).toContain("INSERT INTO lesson_progress");
    expect(sql).toContain("ON CONFLICT DO NOTHING");
    expect(params).toEqual(["u1", "m08-conceptos-seguridad", "01-triada-cia"]);
  });
  it("done=false elimina solo la fila del propio usuario", async () => {
    await PUT(jsonRequest(url, { key: KEY, done: false }, { method: "PUT" }));
    const [sql, params] = m.query.mock.calls[0];
    expect(sql).toContain("DELETE FROM lesson_progress WHERE user_id = $1");
    expect(params).toEqual(["u1", "m08-conceptos-seguridad", "01-triada-cia"]);
  });
});

describe("POST /api/progress (importación desde localStorage)", () => {
  it("401 sin sesión", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    expect((await POST(jsonRequest(url, { keys: [KEY] }))).status).toBe(401);
  });
  it("importa solo claves conocidas y sin duplicados", async () => {
    const res = await POST(jsonRequest(url, { keys: [KEY, KEY, "m08-conceptos-seguridad/02-riesgo", "x/y", "otro/modulo"] }));
    expect(await res.json()).toEqual({ imported: 2 });
    const [sql, params] = m.query.mock.calls[0];
    expect(sql).toContain("unnest($2::text[])");
    expect(params[0]).toBe("u1");
    expect(params[1]).toEqual([KEY, "m08-conceptos-seguridad/02-riesgo"]);
  });
  it("no consulta la BD si no hay claves válidas", async () => {
    const res = await POST(jsonRequest(url, { keys: ["x/y"] }));
    expect(await res.json()).toEqual({ imported: 0 });
    expect(m.query).not.toHaveBeenCalled();
  });
  it("400 con más de 500 claves o claves mal formadas", async () => {
    expect((await POST(jsonRequest(url, { keys: Array.from({ length: 501 }, (_, i) => `a/b${i}`) }))).status).toBe(400);
    expect((await POST(jsonRequest(url, { keys: ["../x"] }))).status).toBe(400);
    expect((await POST(jsonRequest(url, {}))).status).toBe(400);
  });
});
