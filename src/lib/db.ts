import { Pool, type QueryResultRow } from "pg";

declare global {
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida");
  }
  return new Pool({ connectionString, max: 10 });
}

// Reutiliza el pool entre recargas en desarrollo.
export function getPool(): Pool {
  globalThis.__pgPool ??= createPool();
  return globalThis.__pgPool;
}

// Única vía de acceso a la BD. Usar siempre parámetros ($1, $2...), nunca concatenar input.
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}
