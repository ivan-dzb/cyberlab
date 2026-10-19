import { describe, expect, it } from "vitest";
import { flattenKeys, messages } from "../dom";

const get = (obj: unknown, path: string): unknown => path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const esKeys = flattenKeys(messages.es).sort();
const enKeys = flattenKeys(messages.en).sort();

describe("mensajes es/en", () => {
  it("tienen exactamente las mismas claves (nada sin traducir)", () => {
    expect(enKeys.filter((k) => !esKeys.includes(k))).toEqual([]);
    expect(esKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it("ninguna traducción está vacía", () => {
    for (const k of esKeys) {
      expect((get(messages.es, k) as string).trim(), `es:${k}`).not.toBe("");
      expect((get(messages.en, k) as string).trim(), `en:${k}`).not.toBe("");
    }
  });

  it("los marcadores {variable} coinciden en ambos idiomas", () => {
    for (const k of esKeys) {
      expect(placeholders(get(messages.en, k) as string), k).toEqual(placeholders(get(messages.es, k) as string));
    }
  });

  it("el inglés no es una copia literal del español (salvo nombres propios y siglas)", () => {
    // Nombres propios, siglas y términos técnicos que se escriben igual en ambos idiomas.
    const allowedSame = new Set([
      "Meta.title", "Home.title", "Session.errors.badRequest", "Session.errors.invalidInput",
      "Modules.minutes", "Challenges.xp", "Profile.xp", "Session.xpAwarded",
      "Stages.s2", "Stages.s3", "Stages.s5", "Stages.s6", "Stages.s7",
    ]);
    const identical = esKeys.filter((k) => get(messages.es, k) === get(messages.en, k) && !allowedSame.has(k));
    expect(identical).toEqual([]);
  });

  it("cubre los espacios de nombres que usa la aplicación", () => {
    for (const ns of ["Meta", "Nav", "Home", "Stages", "Footer", "Modules", "Auth", "Challenges", "Session", "Hints", "Profile"]) {
      expect(messages.es, ns).toHaveProperty(ns);
      expect(messages.en, ns).toHaveProperty(ns);
    }
  });

  it("las 9 etapas del mapa están traducidas", () => {
    for (let i = 0; i <= 8; i++) {
      expect(messages.es.Stages).toHaveProperty(`s${i}`);
      expect(messages.en.Stages).toHaveProperty(`s${i}`);
    }
  });

  it("cada código de error que devuelve la API tiene mensaje en Auth y Session", () => {
    for (const code of ["invalidInput", "registerFailed", "invalidCredentials", "rateLimited", "badRequest", "server"]) {
      expect(messages.es.Auth.errors, code).toHaveProperty(code);
      expect(messages.en.Auth.errors, code).toHaveProperty(code);
    }
    for (const code of ["activeSession", "rateLimited", "notFound", "server", "badRequest", "invalidInput", "unauthorized", "noSession"]) {
      expect(messages.es.Session.errors, code).toHaveProperty(code);
      expect(messages.en.Session.errors, code).toHaveProperty(code);
    }
  });
});
