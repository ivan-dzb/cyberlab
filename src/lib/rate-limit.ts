import "server-only";
import { createHash } from "node:crypto";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/http";

export type Limit = { name: string; subject: string; max: number; windowSec: number };

const digest = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Ventana fija en Postgres: un UPSERT atómico incrementa el contador de la ventana actual.
 * Devuelve segundos hasta el reinicio si se supera el límite, o null si se permite.
 */
export async function hit({ name, subject, max, windowSec }: Limit): Promise<number | null> {
  const nowSec = Math.floor(Date.now() / 1000);
  const start = nowSec - (nowSec % windowSec);
  const rows = await query<{ hits: number }>(
    `INSERT INTO rate_limit (key, window_start, hits) VALUES ($1, to_timestamp($2), 1)
     ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limit.hits + 1
     RETURNING hits`,
    [`${name}:${digest(subject)}`, start],
  );
  if (rows[0].hits <= max) return null;
  return start + windowSec - nowSec;
}

/** Aplica varios límites; devuelve una respuesta 429 si alguno se supera. */
export async function enforce(limits: Limit[]): Promise<Response | null> {
  for (const l of limits) {
    const retry = await hit(l);
    if (retry !== null) return jsonError("rateLimited", 429, { "Retry-After": String(retry) });
  }
  // Limpieza oportunista (≈1% de las peticiones) de ventanas antiguas.
  if (Math.random() < 0.01) {
    void query("DELETE FROM rate_limit WHERE window_start < now() - interval '1 day'").catch(() => {});
  }
  return null;
}
