import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeCookieJar } from "../../../tests/helpers";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
let jar = makeCookieJar();
vi.mock("@/lib/db", () => ({ query }));
vi.mock("next/headers", () => ({ cookies: async () => jar.api }));

import { createSession, destroySession, getCurrentUser } from "./session";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

beforeEach(() => {
  query.mockReset();
  jar = makeCookieJar();
});

describe("createSession", () => {
  it("guarda solo el hash del token y pone la cookie con el token", async () => {
    query.mockResolvedValue([]);
    await createSession("user-1");

    const token = jar.store.get("session")!;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes base64url
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("INSERT INTO auth_session");
    expect(params[0]).toBe(sha(token));
    expect(params[0]).not.toBe(token);
    expect(params[1]).toBe("user-1");
  });

  it("la cookie es httpOnly, SameSite=Lax, path / y caduca en ~30 días", async () => {
    query.mockResolvedValue([]);
    await createSession("u");
    const opts = jar.api.set.mock.calls[0][2]!;
    expect(opts).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    const days = (opts.expires!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it("marca la cookie Secure solo en producción", async () => {
    query.mockResolvedValue([]);
    vi.stubEnv("NODE_ENV", "production");
    await createSession("u");
    expect(jar.api.set.mock.calls[0][2]?.secure).toBe(true);
    vi.stubEnv("NODE_ENV", "development");
    await createSession("u");
    expect(jar.api.set.mock.calls[1][2]?.secure).toBe(false);
    vi.unstubAllEnvs();
  });

  it("cada sesión recibe un token distinto", async () => {
    query.mockResolvedValue([]);
    await createSession("u");
    const a = jar.store.get("session");
    await createSession("u");
    expect(jar.store.get("session")).not.toBe(a);
  });
});

describe("getCurrentUser", () => {
  it("devuelve null sin cookie y no consulta la BD", async () => {
    expect(await getCurrentUser()).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("busca por el hash del token y devuelve el usuario", async () => {
    jar = makeCookieJar({ session: "tok" });
    query.mockResolvedValue([{ id: "u1", email: "a@b.co" }]);
    expect(await getCurrentUser()).toEqual({ id: "u1", email: "a@b.co" });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("expires_at > now()");
    expect(params).toEqual([sha("tok")]);
  });

  it("devuelve null si la sesión no existe o expiró", async () => {
    jar = makeCookieJar({ session: "tok" });
    query.mockResolvedValue([]);
    expect(await getCurrentUser()).toBeNull();
  });
});

describe("destroySession", () => {
  it("borra la fila por hash y elimina la cookie", async () => {
    jar = makeCookieJar({ session: "tok" });
    query.mockResolvedValue([]);
    await destroySession();
    expect(query.mock.calls[0][1]).toEqual([sha("tok")]);
    expect(jar.api.delete).toHaveBeenCalledWith("session");
  });

  it("sin cookie solo intenta borrarla (no consulta la BD)", async () => {
    await destroySession();
    expect(query).not.toHaveBeenCalled();
    expect(jar.api.delete).toHaveBeenCalledWith("session");
  });
});
