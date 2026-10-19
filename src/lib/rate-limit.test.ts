import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ query }));

import { enforce, hit } from "./rate-limit";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

beforeEach(() => {
  query.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-19T12:00:10Z")); // 10 s dentro de la ventana de 60 s
});
afterEach(() => vi.useRealTimers());

describe("hit", () => {
  it("permite mientras los aciertos no superen el máximo", async () => {
    query.mockResolvedValue([{ hits: 5 }]);
    expect(await hit({ name: "login", subject: "a@b.co", max: 5, windowSec: 60 })).toBeNull();
  });

  it("devuelve los segundos hasta el reinicio al superar el máximo", async () => {
    query.mockResolvedValue([{ hits: 6 }]);
    expect(await hit({ name: "login", subject: "a@b.co", max: 5, windowSec: 60 })).toBe(50);
  });

  it("guarda la clave hasheada: ni IP ni correo en claro", async () => {
    query.mockResolvedValue([{ hits: 1 }]);
    await hit({ name: "login-ip", subject: "203.0.113.5", max: 5, windowSec: 60 });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("ON CONFLICT");
    expect(params[0]).toBe(`login-ip:${sha("203.0.113.5")}`);
    expect(JSON.stringify(params)).not.toContain("203.0.113.5");
  });

  it("alinea el inicio de ventana a múltiplos de windowSec", async () => {
    query.mockResolvedValue([{ hits: 1 }]);
    await hit({ name: "x", subject: "s", max: 1, windowSec: 900 });
    const start = query.mock.calls[0][1][1] as number;
    expect(start % 900).toBe(0);
    expect(start).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
  });

  it("claves distintas por nombre y por sujeto", async () => {
    query.mockResolvedValue([{ hits: 1 }]);
    await hit({ name: "a", subject: "s", max: 1, windowSec: 60 });
    await hit({ name: "b", subject: "s", max: 1, windowSec: 60 });
    await hit({ name: "a", subject: "t", max: 1, windowSec: 60 });
    const keys = query.mock.calls.map((c) => c[1][0]);
    expect(new Set(keys).size).toBe(3);
  });
});

describe("enforce", () => {
  it("devuelve null si todos los límites pasan", async () => {
    query.mockResolvedValue([{ hits: 1 }]);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    expect(await enforce([{ name: "a", subject: "s", max: 5, windowSec: 60 }])).toBeNull();
  });

  it("devuelve 429 con Retry-After cuando se supera un límite", async () => {
    query.mockResolvedValue([{ hits: 99 }]);
    const res = await enforce([{ name: "a", subject: "s", max: 5, windowSec: 60 }]);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get("retry-after")).toBe("50");
    expect(await res!.json()).toEqual({ error: "rateLimited" });
  });

  it("se detiene en el primer límite superado", async () => {
    query.mockResolvedValueOnce([{ hits: 99 }]).mockResolvedValue([{ hits: 1 }]);
    const res = await enforce([
      { name: "primero", subject: "s", max: 5, windowSec: 60 },
      { name: "segundo", subject: "s", max: 5, windowSec: 60 },
    ]);
    expect(res!.status).toBe(429);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("limpia ventanas antiguas de forma oportunista (~1 %)", async () => {
    query.mockResolvedValue([{ hits: 1 }]);
    vi.spyOn(Math, "random").mockReturnValue(0.001);
    await enforce([{ name: "a", subject: "s", max: 5, windowSec: 60 }]);
    expect(query.mock.calls.some((c) => String(c[0]).includes("DELETE FROM rate_limit"))).toBe(true);
  });

  it("no limpia en el 99 % restante", async () => {
    query.mockResolvedValue([{ hits: 1 }]);
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    await enforce([{ name: "a", subject: "s", max: 5, windowSec: 60 }]);
    expect(query.mock.calls.some((c) => String(c[0]).includes("DELETE FROM rate_limit"))).toBe(false);
  });
});
