import { beforeEach, describe, expect, it, vi } from "vitest";
import { jsonRequest } from "../../../../tests/helpers";

const m = vi.hoisted(() => ({
  query: vi.fn(),
  enforce: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  dummyHash: vi.fn(),
  createSession: vi.fn(),
  destroySession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ query: m.query }));
vi.mock("@/lib/rate-limit", () => ({ enforce: m.enforce }));
vi.mock("@/lib/auth/password", () => ({ hashPassword: m.hashPassword, verifyPassword: m.verifyPassword, dummyHash: m.dummyHash }));
vi.mock("@/lib/auth/session", () => ({ createSession: m.createSession, destroySession: m.destroySession }));

import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { POST as register } from "./register/route";

const valid = { email: "  Ana@Example.com ", password: "correct-horse-battery", acceptTerms: true };

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset();
  m.enforce.mockResolvedValue(null);
  m.hashPassword.mockResolvedValue("scrypt$hash");
  m.verifyPassword.mockResolvedValue(true);
  m.dummyHash.mockResolvedValue("scrypt$dummy");
  m.createSession.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/auth/register", () => {
  const post = (body: unknown, headers?: Record<string, string>) => register(jsonRequest("http://localhost:3000/api/auth/register", body, { headers }));

  it("400 badRequest sin Content-Type JSON (defensa CSRF)", async () => {
    const res = await register(new Request("http://localhost:3000/api/auth/register", { method: "POST", body: "x=1" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "badRequest" });
  });

  it("400 badRequest con Origin ajeno", async () => {
    const res = await post(valid, { origin: "http://evil.com" });
    expect(res.status).toBe(400);
    expect(m.query).not.toHaveBeenCalled();
  });

  it.each([
    ["sin aceptar términos", { ...valid, acceptTerms: false }],
    ["contraseña corta", { ...valid, password: "corta" }],
    ["correo inválido", { ...valid, email: "no-es-correo" }],
    ["cuerpo vacío", {}],
  ])("400 invalidInput: %s", async (_n, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalidInput" });
    expect(m.hashPassword).not.toHaveBeenCalled();
  });

  it("400 invalidInput con JSON mal formado", async () => {
    const req = new Request("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost:3000" },
      body: "{no es json",
    });
    expect((await register(req)).status).toBe(400);
  });

  it("429 cuando el límite por IP se supera, sin tocar la BD", async () => {
    m.enforce.mockResolvedValue(new Response(JSON.stringify({ error: "rateLimited" }), { status: 429 }));
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect(m.query).not.toHaveBeenCalled();
    expect(m.enforce.mock.calls[0][0][0]).toMatchObject({ name: "register-ip", max: 5, windowSec: 3600 });
  });

  it("201: normaliza el correo, guarda hash y versión de términos, y abre sesión", async () => {
    m.query.mockResolvedValue([{ id: "u1" }]);
    const res = await post(valid);
    expect(res.status).toBe(201);
    const [sql, params] = m.query.mock.calls[0];
    expect(sql).toContain("INSERT INTO app_user");
    expect(sql).toContain("ON CONFLICT (email) DO NOTHING");
    expect(params[0]).toBe("ana@example.com");
    expect(params[1]).toBe("scrypt$hash");
    expect(params[2]).toBe("2026-10-18");
    expect(JSON.stringify(params)).not.toContain("correct-horse-battery");
    expect(m.createSession).toHaveBeenCalledWith("u1");
  });

  it("400 registerFailed (mensaje genérico) si el correo ya existe, sin abrir sesión", async () => {
    m.query.mockResolvedValue([]);
    const res = await post(valid);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "registerFailed" });
    expect(m.createSession).not.toHaveBeenCalled();
  });

  it("500 sin filtrar detalles internos si la BD falla", async () => {
    m.query.mockRejectedValue(new Error("password authentication failed for user cyberlab"));
    const res = await post(valid);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("cyberlab");
  });
});

describe("POST /api/auth/login", () => {
  const post = (body: unknown, headers?: Record<string, string>) => login(jsonRequest("http://localhost:3000/api/auth/login", body, { headers }));
  const creds = { email: "ana@example.com", password: "correct-horse-battery" };

  it("400 sin Content-Type JSON", async () => {
    const res = await login(new Request("http://localhost:3000/api/auth/login", { method: "POST", body: "x" }));
    expect(res.status).toBe(400);
  });

  it("401 genérico ante entrada inválida (no distingue por qué)", async () => {
    const res = await post({ email: "nope", password: "" });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalidCredentials" });
  });

  it("aplica límites por IP (30/15 min) y por cuenta (5/15 min)", async () => {
    m.query.mockResolvedValue([{ id: "u1", password_hash: "scrypt$real" }]);
    await post(creds, { "x-forwarded-for": "203.0.113.9" });
    const limits = m.enforce.mock.calls[0][0];
    expect(limits).toEqual([
      { name: "login-ip", subject: "203.0.113.9", max: 30, windowSec: 900 },
      { name: "login-acct", subject: "ana@example.com", max: 5, windowSec: 900 },
    ]);
  });

  it("429 si se supera el límite, sin consultar usuarios", async () => {
    m.enforce.mockResolvedValue(new Response("{}", { status: 429 }));
    const res = await post(creds);
    expect(res.status).toBe(429);
    expect(m.query).not.toHaveBeenCalled();
    expect(m.verifyPassword).not.toHaveBeenCalled();
  });

  it("200 con credenciales correctas y abre sesión", async () => {
    m.query.mockResolvedValue([{ id: "u1", password_hash: "scrypt$real" }]);
    const res = await post(creds);
    expect(res.status).toBe(200);
    expect(m.verifyPassword).toHaveBeenCalledWith("correct-horse-battery", "scrypt$real");
    expect(m.createSession).toHaveBeenCalledWith("u1");
  });

  it("401 con contraseña incorrecta, sin abrir sesión", async () => {
    m.query.mockResolvedValue([{ id: "u1", password_hash: "scrypt$real" }]);
    m.verifyPassword.mockResolvedValue(false);
    const res = await post(creds);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalidCredentials" });
    expect(m.createSession).not.toHaveBeenCalled();
  });

  it("correo inexistente: misma respuesta y verifica igualmente un hash ficticio (sin diferencia de tiempo)", async () => {
    m.query.mockResolvedValue([]);
    const res = await post(creds);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalidCredentials" });
    expect(m.verifyPassword).toHaveBeenCalledWith("correct-horse-battery", "scrypt$dummy");
    expect(m.createSession).not.toHaveBeenCalled();
  });

  it("incluso si la verificación del hash ficticio diera true, no abre sesión sin usuario", async () => {
    m.query.mockResolvedValue([]);
    m.verifyPassword.mockResolvedValue(true);
    const res = await post(creds);
    expect(res.status).toBe(401);
    expect(m.createSession).not.toHaveBeenCalled();
  });

  it("500 si la BD falla", async () => {
    m.query.mockRejectedValue(new Error("db"));
    expect((await post(creds)).status).toBe(500);
  });
});

describe("POST /api/auth/logout", () => {
  it("destruye la sesión", async () => {
    const res = await logout(jsonRequest("http://localhost:3000/api/auth/logout", {}));
    expect(res.status).toBe(200);
    expect(m.destroySession).toHaveBeenCalledTimes(1);
  });
  it("400 sin JSON (no se puede cerrar sesión por CSRF)", async () => {
    const res = await logout(new Request("http://localhost:3000/api/auth/logout", { method: "POST" }));
    expect(res.status).toBe(400);
    expect(m.destroySession).not.toHaveBeenCalled();
  });
});
