import { describe, expect, it } from "vitest";
import { levelFor, xpFor } from "./xp";

describe("xpFor", () => {
  it("otorga el XP completo sin pistas", () => expect(xpFor(50, 0)).toBe(50));
  it("resta un 20 % por pista", () => {
    expect(xpFor(50, 1)).toBe(40);
    expect(xpFor(50, 2)).toBe(30);
  });
  it("nunca baja del 40 % del XP base", () => {
    expect(xpFor(50, 3)).toBe(20);
    expect(xpFor(50, 4)).toBe(20);
    expect(xpFor(50, 99)).toBe(20);
  });
  it("redondea al entero más cercano", () => expect(xpFor(10, 1)).toBe(8));
  it("un reto de 0 XP siempre vale 0", () => expect(xpFor(0, 2)).toBe(0));
});

describe("levelFor", () => {
  it("empieza en el nivel 1 con 0 XP", () => {
    expect(levelFor(0)).toEqual({ level: 1, xp: 0, floor: 0, next: 50, progress: 0 });
  });
  it("sube de nivel exactamente en el umbral", () => {
    expect(levelFor(49).level).toBe(1);
    expect(levelFor(50).level).toBe(2);
    expect(levelFor(149).level).toBe(2);
    expect(levelFor(150).level).toBe(3);
  });
  it("calcula el progreso dentro del nivel", () => {
    const lv = levelFor(100); // nivel 2: 50..150
    expect(lv.floor).toBe(50);
    expect(lv.next).toBe(150);
    expect(lv.progress).toBeCloseTo(0.5);
  });
  it("en el nivel máximo no hay siguiente y el progreso es 1", () => {
    const lv = levelFor(1_000_000);
    expect(lv.level).toBe(10);
    expect(lv.next).toBeNull();
    expect(lv.progress).toBe(1);
  });
});
