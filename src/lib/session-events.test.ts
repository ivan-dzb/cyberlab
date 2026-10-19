import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ query }));

import { logSessionEvent } from "./session-events";

beforeEach(() => {
  query.mockReset();
});

describe("logSessionEvent", () => {
  it("inserta el evento con sus parámetros", async () => {
    query.mockResolvedValue([]);
    await logSessionEvent("sid", "uid", "inicio", { reto: "x" });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("INSERT INTO session_event");
    expect(params).toEqual(["sid", "uid", "inicio", { reto: "x" }]);
  });

  it("usa un detalle vacío por defecto", async () => {
    query.mockResolvedValue([]);
    await logSessionEvent("sid", "uid", "fin");
    expect(query.mock.calls[0][1][3]).toEqual({});
  });

  it("nunca rompe el flujo principal si la BD falla", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    query.mockImplementation(async () => {
      throw new Error("db caída");
    });
    await expect(logSessionEvent("sid", "uid", "error")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
  });
});
