import { describe, expect, it } from "vitest";
import { email, loginSchema, password, registerSchema } from "./schemas";

describe("email", () => {
  it("normaliza a minúsculas y recorta espacios", () => {
    expect(email.parse("  Ana@Example.COM ")).toBe("ana@example.com");
  });
  it("rechaza formatos inválidos", () => {
    for (const bad of ["", "ana", "ana@", "@example.com", "a b@example.com"]) {
      expect(email.safeParse(bad).success, bad).toBe(false);
    }
  });
  it("rechaza correos de más de 254 caracteres", () => {
    expect(email.safeParse(`${"a".repeat(250)}@x.co`).success).toBe(false);
  });
});

describe("password", () => {
  it("exige al menos 10 caracteres", () => {
    expect(password.safeParse("123456789").success).toBe(false);
    expect(password.safeParse("1234567890").success).toBe(true);
  });
  it("limita a 128 caracteres (evita DoS por hashing)", () => {
    expect(password.safeParse("a".repeat(128)).success).toBe(true);
    expect(password.safeParse("a".repeat(129)).success).toBe(false);
  });
});

describe("registerSchema", () => {
  const ok = { email: "a@b.co", password: "correct-horse-battery", acceptTerms: true };
  it("acepta datos válidos", () => expect(registerSchema.safeParse(ok).success).toBe(true));
  it("exige aceptar los términos (true literal)", () => {
    expect(registerSchema.safeParse({ ...ok, acceptTerms: false }).success).toBe(false);
    expect(registerSchema.safeParse({ ...ok, acceptTerms: "true" }).success).toBe(false);
    expect(registerSchema.safeParse({ email: ok.email, password: ok.password }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("acepta cualquier clave no vacía (la validez la decide el hash)", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
  it("rechaza clave vacía o excesiva", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "a".repeat(129) }).success).toBe(false);
  });
});
