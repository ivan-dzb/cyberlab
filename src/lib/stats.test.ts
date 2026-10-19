import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ query }));

import { getCompletedChallenges, getCompletedLessonKeys, getLevel, getXp } from "./stats";

beforeEach(() => {
  query.mockReset();
});

describe("getXp", () => {
  it("convierte la suma (string de Postgres) a número", async () => {
    query.mockResolvedValue([{ xp: "60" }]);
    expect(await getXp("u1")).toBe(60);
    expect(query.mock.calls[0][1]).toEqual(["u1"]);
    expect(query.mock.calls[0][0]).toContain("estado = 'completado'");
  });
  it("es 0 sin progreso (COALESCE)", async () => {
    query.mockResolvedValue([{ xp: "0" }]);
    expect(await getXp("u1")).toBe(0);
  });
});

describe("getLevel", () => {
  it("calcula el nivel a partir del XP", async () => {
    query.mockResolvedValue([{ xp: "160" }]);
    const lv = await getLevel("u1");
    expect(lv.level).toBe(3);
    expect(lv.xp).toBe(160);
  });
});

describe("getCompletedChallenges", () => {
  const row = (slug: string, titulo: Record<string, string>) => ({
    slug,
    titulo,
    nivel: "principiante",
    xp_otorgado: 40,
    completado_en: new Date("2026-10-19T10:00:00Z"),
  });

  it("devuelve el título en el idioma pedido", async () => {
    query.mockResolvedValue([row("a", { es: "Hola", en: "Hello" })]);
    const [c] = await getCompletedChallenges("u1", "en");
    expect(c).toMatchObject({ slug: "a", titulo: "Hello", nivel: "principiante", xp: 40 });
  });
  it("cae a español si falta la traducción", async () => {
    query.mockResolvedValue([row("a", { es: "Hola" })]);
    expect((await getCompletedChallenges("u1", "en"))[0].titulo).toBe("Hola");
  });
  it("devuelve lista vacía sin retos completados", async () => {
    query.mockResolvedValue([]);
    expect(await getCompletedChallenges("u1", "es")).toEqual([]);
  });
});

describe("getCompletedLessonKeys", () => {
  it("devuelve las claves módulo/lección", async () => {
    query.mockResolvedValue([{ k: "m08/01" }, { k: "m08/02" }]);
    expect(await getCompletedLessonKeys("u1")).toEqual(["m08/01", "m08/02"]);
  });
});
