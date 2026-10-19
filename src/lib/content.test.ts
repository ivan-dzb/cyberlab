import { describe, expect, it } from "vitest";
import { getLesson, getModule, listModules } from "./content";

describe("listModules", () => {
  it("lista M08 con sus cinco lecciones en orden", async () => {
    const mods = await listModules("es");
    const m08 = mods.find((m) => m.id === "M08");
    expect(m08).toBeDefined();
    expect(m08!.slug).toBe("m08-conceptos-seguridad");
    expect(m08!.lecciones).toHaveLength(5);
    expect(m08!.lecciones[0].slug).toBe("01-triada-cia");
    expect(m08!.nivel).toBe("principiante");
  });
  it("traduce título y descripción por idioma", async () => {
    const es = (await listModules("es")).find((m) => m.id === "M08")!;
    const en = (await listModules("en")).find((m) => m.id === "M08")!;
    expect(es.titulo).toBe("Conceptos y principios de seguridad");
    expect(en.titulo).toBe("Security concepts and principles");
    expect(es.lecciones[0].titulo).not.toBe(en.lecciones[0].titulo);
  });
  it("un idioma sin traducción cae a español", async () => {
    const m = (await listModules("fr")).find((x) => x.id === "M08")!;
    expect(m.titulo).toBe("Conceptos y principios de seguridad");
  });
  it("está ordenada por id", async () => {
    const ids = (await listModules("es")).map((m) => m.id);
    expect(ids).toEqual([...ids].sort());
  });
});

describe("getModule", () => {
  it("encuentra por slug", async () => {
    expect((await getModule("m08-conceptos-seguridad", "es"))?.id).toBe("M08");
  });
  it("devuelve null para slugs inexistentes o peligrosos", async () => {
    expect(await getModule("nope", "es")).toBeNull();
    expect(await getModule("../../etc", "es")).toBeNull();
    expect(await getModule("", "es")).toBeNull();
  });
});

describe("getLesson", () => {
  it("lee la lección con su frontmatter", async () => {
    const l = await getLesson("m08-conceptos-seguridad", "01-triada-cia", "es");
    expect(l).not.toBeNull();
    expect(l!.titulo).toBe("La tríada CIA y sus extensiones");
    expect(l!.tiempoMin).toBe(20);
    expect(l!.body).toContain("Confidencialidad");
    expect(l!.fallback).toBe(false);
  });
  it("normaliza la fecha de revisión a ISO (YAML la parsea como Date)", async () => {
    const l = await getLesson("m08-conceptos-seguridad", "01-triada-cia", "es");
    expect(l!.ultimaRevision).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("devuelve la versión en inglés cuando existe", async () => {
    const l = await getLesson("m08-conceptos-seguridad", "01-triada-cia", "en");
    expect(l!.titulo).toBe("The CIA triad and its extensions");
    expect(l!.fallback).toBe(false);
  });
  it("marca fallback cuando el idioma no existe y usa español", async () => {
    const l = await getLesson("m08-conceptos-seguridad", "01-triada-cia", "fr");
    expect(l!.fallback).toBe(true);
    expect(l!.titulo).toBe("La tríada CIA y sus extensiones");
  });
  it("solo sirve lecciones declaradas en module.json (allowlist)", async () => {
    expect(await getLesson("m08-conceptos-seguridad", "99-inexistente", "es")).toBeNull();
    expect(await getLesson("m08-conceptos-seguridad", "../module", "es")).toBeNull();
    expect(await getLesson("../content", "01-triada-cia", "es")).toBeNull();
  });
});
