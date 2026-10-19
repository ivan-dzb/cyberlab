import { describe, expect, it, vi } from "vitest";

// El middleware real depende del runtime de Next; aquí solo se prueba su configuración.
vi.mock("next-intl/middleware", () => ({ default: () => () => undefined }));

import { config } from "../../src/middleware";
import { routing } from "../../src/i18n/routing";

const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("routing i18n", () => {
  it("soporta es y en, con es por defecto", () => {
    expect([...routing.locales]).toEqual(["es", "en"]);
    expect(routing.defaultLocale).toBe("es");
  });
});

describe("matcher del middleware", () => {
  it.each(["/", "/es", "/en/modules", "/es/challenges/bienvenida", "/terms", "/login"])("aplica a %s", (p) => {
    expect(matcher.test(p), p).toBe(true);
  });
  it.each(["/api/health", "/api/auth/login", "/api/sessions", "/_next/static/chunks/main.js", "/favicon.ico", "/robots.txt", "/_vercel/x"])(
    "NO intercepta %s (API, internos y estáticos)",
    (p) => {
      expect(matcher.test(p), p).toBe(false);
    },
  );
});
