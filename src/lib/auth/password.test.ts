import { describe, expect, it } from "vitest";
import { dummyHash, hashPassword, verifyPassword } from "./password";

describe("password hashing (scrypt)", () => {
  it("genera el formato scrypt$N$r$p$sal$hash", async () => {
    const h = await hashPassword("correct-horse-battery");
    const [scheme, n, r, p, salt, hash] = h.split("$");
    expect(scheme).toBe("scrypt");
    expect(Number(n)).toBe(2 ** 17);
    expect(Number(r)).toBe(8);
    expect(Number(p)).toBe(1);
    expect(Buffer.from(salt, "base64")).toHaveLength(16);
    expect(Buffer.from(hash, "base64")).toHaveLength(64);
    expect(h).not.toContain("correct-horse-battery");
  });

  it("usa una sal distinta cada vez", async () => {
    const [a, b] = await Promise.all([hashPassword("same-password-1"), hashPassword("same-password-1")]);
    expect(a).not.toBe(b);
  });

  it("verifica la clave correcta y rechaza una incorrecta", async () => {
    const h = await hashPassword("correct-horse-battery");
    expect(await verifyPassword("correct-horse-battery", h)).toBe(true);
    expect(await verifyPassword("correct-horse-batterY", h)).toBe(false);
    expect(await verifyPassword("", h)).toBe(false);
  });

  it("normaliza Unicode (NFKC): formas equivalentes dan el mismo resultado", async () => {
    const composed = "café-secret-1"; // é precompuesta
    const decomposed = "café-secret-1"; // e + acento combinante
    const h = await hashPassword(composed);
    expect(await verifyPassword(decomposed, h)).toBe(true);
  });

  it("rechaza hashes mal formados sin lanzar", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$2b$10$abc")).toBe(false);
    expect(await verifyPassword("x", "scrypt$131072$8$1$solo-sal")).toBe(false);
  });

  it("dummyHash es un hash válido y se reutiliza (misma promesa)", async () => {
    const [a, b] = [dummyHash(), dummyHash()];
    expect(a).toBe(b);
    expect((await a).startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("otra-cosa-distinta", await a)).toBe(false);
  });
});
