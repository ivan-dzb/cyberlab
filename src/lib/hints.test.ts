import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ query }));

import { getHints } from "./hints";

const row = (over: Partial<{ pistas: Record<string, string[]>; usadas: number | null; estado: string | null }> = {}) => ({
  id: "c1",
  pistas: { es: ["p1", "p2", "p3"], en: ["h1", "h2", "h3"] },
  usadas: 0,
  estado: null,
  ...over,
});

beforeEach(() => {
  query.mockReset();
});

describe("getHints", () => {
  it("devuelve null si el reto no existe o no es visible", async () => {
    query.mockResolvedValue([]);
    expect(await getHints("u", "nope", "es")).toBeNull();
  });

  it("sin pistas desbloqueadas no revela ningún texto", async () => {
    query.mockResolvedValue([row()]);
    expect(await getHints("u", "x", "es")).toEqual({ total: 3, unlocked: 0, hints: [], completed: false });
  });

  it("solo devuelve el texto de las pistas ya desbloqueadas", async () => {
    query.mockResolvedValue([row({ usadas: 2 })]);
    const s = await getHints("u", "x", "es");
    expect(s!.hints).toEqual(["p1", "p2"]);
    expect(JSON.stringify(s)).not.toContain("p3");
  });

  it("respeta el idioma y cae a español si falta", async () => {
    query.mockResolvedValue([row({ usadas: 1 })]);
    expect((await getHints("u", "x", "en"))!.hints).toEqual(["h1"]);
    query.mockResolvedValue([row({ usadas: 1, pistas: { es: ["solo-es"] } })]);
    expect((await getHints("u", "x", "en"))!.hints).toEqual(["solo-es"]);
  });

  it("no desbloquea más del total aunque la BD tenga un número mayor", async () => {
    query.mockResolvedValue([row({ usadas: 9 })]);
    const s = await getHints("u", "x", "es");
    expect(s!.unlocked).toBe(3);
    expect(s!.hints).toHaveLength(3);
  });

  it("marca completed cuando el reto está completado", async () => {
    query.mockResolvedValue([row({ estado: "completado", usadas: 1 })]);
    expect((await getHints("u", "x", "es"))!.completed).toBe(true);
  });

  it("un reto sin pistas devuelve total 0", async () => {
    query.mockResolvedValue([row({ pistas: {} })]);
    expect(await getHints("u", "x", "es")).toMatchObject({ total: 0, unlocked: 0, hints: [] });
  });

  it("consulta con usuario y slug como parámetros", async () => {
    query.mockResolvedValue([row()]);
    await getHints("user-9", "mi-reto", "es");
    expect(query.mock.calls[0][1]).toEqual(["user-9", "mi-reto"]);
  });
});
