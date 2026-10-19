import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ query }));

import { getChallenge, listChallenges } from "./challenges";

const row = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  slug: "demo",
  titulo: { es: "Título", en: "Title" },
  descripcion: { es: "Descripción", en: "Description" },
  nivel: "principiante",
  xp: 50,
  teoria_md: { es: "## es", en: "## en" },
  limites: {},
  herramientas: null,
  ...over,
});

beforeEach(() => {
  query.mockReset();
});

describe("listChallenges", () => {
  it("solo consulta retos visibles y los ordena por nivel y slug", async () => {
    query.mockResolvedValue([]);
    await listChallenges("es");
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("WHERE c.visible");
    expect(sql).toContain("array_position");
  });

  it("traduce según el idioma y expone herramientas vacías por defecto", async () => {
    query.mockResolvedValue([row()]);
    const [c] = await listChallenges("en");
    expect(c).toMatchObject({ slug: "demo", titulo: "Title", descripcion: "Description", teoria: "## en", tools: [], fallback: false });
  });

  it("cae a español y marca fallback si falta la teoría en el idioma", async () => {
    query.mockResolvedValue([row({ teoria_md: { es: "## es" }, titulo: { es: "Solo es" } })]);
    const [c] = await listChallenges("en");
    expect(c.teoria).toBe("## es");
    expect(c.titulo).toBe("Solo es");
    expect(c.fallback).toBe(true);
  });

  it("incluye las herramientas relacionadas", async () => {
    query.mockResolvedValue([row({ herramientas: ["Burp Suite", "ffuf"] })]);
    expect((await listChallenges("es"))[0].tools).toEqual(["Burp Suite", "ffuf"]);
  });

  it("no expone el writeup ni las pistas en el catálogo público", async () => {
    query.mockResolvedValue([row({ writeup: { es: "SOLUCIÓN" }, pistas: { es: ["PISTA"] } })]);
    const json = JSON.stringify(await listChallenges("es"));
    expect(json).not.toContain("SOLUCIÓN");
    expect(json).not.toContain("PISTA");
    expect((query.mock.calls[0][0] as string)).not.toMatch(/writeup|pistas/);
  });
});

describe("getChallenge", () => {
  it("devuelve null si no existe o no es visible", async () => {
    query.mockResolvedValue([]);
    expect(await getChallenge("nope", "es")).toBeNull();
  });
  it("busca por slug con parámetro y solo visibles", async () => {
    query.mockResolvedValue([row()]);
    const c = await getChallenge("demo", "es");
    expect(c?.slug).toBe("demo");
    expect(query.mock.calls[0][1]).toEqual(["demo"]);
    expect(query.mock.calls[0][0]).toContain("c.visible AND c.slug = $1");
  });
});
