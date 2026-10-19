import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const poolQuery = vi.fn();
const PoolCtor = vi.fn(function (this: { query: typeof poolQuery }) {
  this.query = poolQuery;
});

vi.mock("pg", () => ({ Pool: PoolCtor }));

async function load() {
  vi.resetModules();
  return import("./db");
}

describe("db", () => {
  const original = process.env.DATABASE_URL;
  beforeEach(() => {
    delete (globalThis as { __pgPool?: unknown }).__pgPool;
    PoolCtor.mockClear();
    poolQuery.mockReset();
  });
  afterEach(() => {
    process.env.DATABASE_URL = original;
  });

  it("falla con un mensaje claro si falta DATABASE_URL", async () => {
    delete process.env.DATABASE_URL;
    const { getPool } = await load();
    expect(() => getPool()).toThrow(/DATABASE_URL/);
  });

  it("crea el pool una sola vez y lo reutiliza", async () => {
    process.env.DATABASE_URL = "postgres://u:p@h/db";
    const { getPool } = await load();
    const a = getPool();
    const b = getPool();
    expect(a).toBe(b);
    expect(PoolCtor).toHaveBeenCalledTimes(1);
    expect(PoolCtor).toHaveBeenCalledWith({ connectionString: "postgres://u:p@h/db", max: 10 });
  });

  it("query devuelve las filas y pasa los parámetros por separado", async () => {
    process.env.DATABASE_URL = "postgres://u:p@h/db";
    poolQuery.mockResolvedValue({ rows: [{ id: 1 }] });
    const { query } = await load();
    const rows = await query("SELECT * FROM t WHERE a = $1", ["x"]);
    expect(rows).toEqual([{ id: 1 }]);
    expect(poolQuery).toHaveBeenCalledWith("SELECT * FROM t WHERE a = $1", ["x"]);
  });

  it("query usa parámetros vacíos por defecto", async () => {
    process.env.DATABASE_URL = "postgres://u:p@h/db";
    poolQuery.mockResolvedValue({ rows: [] });
    const { query } = await load();
    await query("SELECT 1");
    expect(poolQuery).toHaveBeenCalledWith("SELECT 1", []);
  });

  it("propaga los errores de la base de datos", async () => {
    process.env.DATABASE_URL = "postgres://u:p@h/db";
    poolQuery.mockRejectedValue(new Error("boom"));
    const { query } = await load();
    await expect(query("SELECT 1")).rejects.toThrow("boom");
  });
});
