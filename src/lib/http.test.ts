import { describe, expect, it } from "vitest";
import { checkSameOrigin, clientIp, jsonError } from "./http";

const req = (headers: Record<string, string>) => new Request("http://localhost:3000/api/x", { method: "POST", headers });

describe("checkSameOrigin", () => {
  it("exige Content-Type application/json", () => {
    expect(checkSameOrigin(req({ host: "localhost:3000" }))).toBe(false);
    expect(checkSameOrigin(req({ host: "localhost:3000", "content-type": "text/plain" }))).toBe(false);
    expect(checkSameOrigin(req({ host: "localhost:3000", "content-type": "application/x-www-form-urlencoded" }))).toBe(false);
  });
  it("acepta JSON sin cabecera Origin (clientes no navegador)", () => {
    expect(checkSameOrigin(req({ host: "localhost:3000", "content-type": "application/json" }))).toBe(true);
  });
  it("acepta Origin que coincide con Host", () => {
    expect(
      checkSameOrigin(req({ host: "localhost:3000", "content-type": "application/json; charset=utf-8", origin: "http://localhost:3000" })),
    ).toBe(true);
  });
  it("rechaza un Origin distinto (CSRF)", () => {
    expect(checkSameOrigin(req({ host: "localhost:3000", "content-type": "application/json", origin: "http://evil.com" }))).toBe(false);
    // mismo host pero otro puerto = otro origen
    expect(checkSameOrigin(req({ host: "localhost:3000", "content-type": "application/json", origin: "http://localhost:8081" }))).toBe(false);
  });
  it("rechaza un Origin que no es una URL", () => {
    expect(checkSameOrigin(req({ host: "localhost:3000", "content-type": "application/json", origin: "no-es-url" }))).toBe(false);
  });
});

describe("jsonError", () => {
  it("devuelve { error } con el estado dado", async () => {
    const res = jsonError("invalidInput", 400);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalidInput" });
  });
  it("propaga cabeceras adicionales", () => {
    const res = jsonError("rateLimited", 429, { "Retry-After": "30" });
    expect(res.headers.get("retry-after")).toBe("30");
  });
});

describe("clientIp", () => {
  it("usa el primer valor de X-Forwarded-For", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
  });
  it("recorta espacios", () => {
    expect(clientIp(req({ "x-forwarded-for": "  203.0.113.5  ,10.0.0.1" }))).toBe("203.0.113.5");
  });
  it("cae a X-Real-IP y luego a 'unknown'", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
