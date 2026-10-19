import "server-only";
import { query } from "@/lib/db";

export type HintsState = { total: number; unlocked: number; hints: string[]; completed: boolean };

/** Pistas desbloqueadas por el usuario (solo se devuelve el texto de las ya desbloqueadas). */
export async function getHints(userId: string, slug: string, locale: string): Promise<HintsState | null> {
  const [row] = await query<{ id: string; pistas: Record<string, string[]>; usadas: number | null; estado: string | null }>(
    `SELECT c.id, c.pistas, p.pistas_usadas AS usadas, p.estado
     FROM challenge c LEFT JOIN user_progress p ON p.challenge_id = c.id AND p.user_id = $1
     WHERE c.slug = $2 AND c.visible`,
    [userId, slug],
  );
  if (!row) return null;
  const all = row.pistas[locale] ?? row.pistas.es ?? [];
  const unlocked = Math.min(row.usadas ?? 0, all.length);
  return { total: all.length, unlocked, hints: all.slice(0, unlocked), completed: row.estado === "completado" };
}
