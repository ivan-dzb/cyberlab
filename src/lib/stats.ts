import "server-only";
import { query } from "@/lib/db";
import { levelFor } from "@/lib/xp";

export async function getXp(userId: string): Promise<number> {
  const [row] = await query<{ xp: string }>(
    "SELECT COALESCE(SUM(xp_otorgado), 0) AS xp FROM user_progress WHERE user_id = $1 AND estado = 'completado'",
    [userId],
  );
  return Number(row.xp);
}

export async function getLevel(userId: string) {
  return levelFor(await getXp(userId));
}

export type CompletedChallenge = { slug: string; titulo: string; nivel: string; xp: number; completadoEn: Date };

export async function getCompletedChallenges(userId: string, locale: string): Promise<CompletedChallenge[]> {
  const rows = await query<{ slug: string; titulo: Record<string, string>; nivel: string; xp_otorgado: number; completado_en: Date }>(
    `SELECT c.slug, c.titulo, c.nivel, p.xp_otorgado, p.completado_en
     FROM user_progress p JOIN challenge c ON c.id = p.challenge_id
     WHERE p.user_id = $1 AND p.estado = 'completado' ORDER BY p.completado_en DESC`,
    [userId],
  );
  return rows.map((r) => ({
    slug: r.slug,
    titulo: r.titulo[locale] ?? r.titulo.es,
    nivel: r.nivel,
    xp: r.xp_otorgado,
    completadoEn: r.completado_en,
  }));
}

export async function getCompletedLessonKeys(userId: string): Promise<string[]> {
  const rows = await query<{ k: string }>(
    "SELECT module_slug || '/' || lesson_slug AS k FROM lesson_progress WHERE user_id = $1 ORDER BY completed_at DESC",
    [userId],
  );
  return rows.map((r) => r.k);
}
