// Aplica db/migrations/*.sql en orden, cada una en una transacción.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL no está definida");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const { rows } = await client.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`aplicada: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`falló ${file}:`, err.message);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  await client.end();
}
