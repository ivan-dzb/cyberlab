import "server-only";
import { query } from "@/lib/db";

/**
 * Writeup oficial del reto. Se entrega SOLO a quien lo completó: la comprobación vive aquí,
 * en el servidor, y el texto nunca viaja en el catálogo público (lib/challenges.ts no lo selecciona).
 */
export async function getWriteupForUser(
  userId: string,
  slug: string,
  locale: string,
): Promise<{ body: string; fallback: boolean } | null> {
  const [row] = await query<{ writeup: Record<string, string> }>(
    `SELECT c.writeup FROM challenge c JOIN user_progress p ON p.challenge_id = c.id
     WHERE c.slug = $1 AND c.visible AND p.user_id = $2 AND p.estado = 'completado'`,
    [slug, userId],
  );
  if (!row) return null;
  const body = row.writeup[locale] ?? row.writeup.es;
  return body ? { body, fallback: !row.writeup[locale] } : null;
}
