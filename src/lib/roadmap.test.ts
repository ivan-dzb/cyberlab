import { describe, expect, it } from "vitest";
import { moduleId, STAGES, TOTAL_MODULES } from "./roadmap";

describe("roadmap", () => {
  it("las etapas cubren M01..M52 sin huecos ni solapes", () => {
    let expected = 1;
    for (const s of STAGES) {
      expect(s.from).toBe(expected);
      expect(s.to).toBeGreaterThanOrEqual(s.from);
      expected = s.to + 1;
    }
    expect(expected - 1).toBe(TOTAL_MODULES);
  });
  it("tiene 9 etapas numeradas de 0 a 8", () => {
    expect(STAGES.map((s) => s.n)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it("moduleId rellena a dos dígitos", () => {
    expect(moduleId(1)).toBe("M01");
    expect(moduleId(8)).toBe("M08");
    expect(moduleId(52)).toBe("M52");
  });
});
