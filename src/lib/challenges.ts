import "server-only";
import type { Nivel } from "@/lib/content";
import { query } from "@/lib/db";

type I18n = Record<string, string>;

type Row = {
  id: string;
  slug: string;
  titulo: I18n;
  descripcion: I18n;
  nivel: Nivel;
  xp: number;
  teoria_md: I18n;
  limites: { timeout_inactividad_min?: number };
  herramientas: string[] | null;
};

export type ChallengeView = {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string;
  nivel: Nivel;
  xp: number;
  teoria: string;
  tools: string[];
  /** true si la teoría no existe en el idioma pedido. */
  fallback: boolean;
};

const pick = (t: I18n, locale: string) => t[locale] ?? t.es ?? "";

const SELECT = `
  SELECT c.id, c.slug, c.titulo, c.descripcion, c.nivel, c.xp, c.teoria_md, c.limites,
         (SELECT array_agg(t.nombre ORDER BY t.nombre) FROM challenge_tool ct JOIN tool t ON t.id = ct.tool_id
          WHERE ct.challenge_id = c.id) AS herramientas
  FROM challenge c`;

const toView = (r: Row, locale: string): ChallengeView => ({
  id: r.id,
  slug: r.slug,
  titulo: pick(r.titulo, locale),
  descripcion: pick(r.descripcion, locale),
  nivel: r.nivel,
  xp: r.xp,
  teoria: pick(r.teoria_md, locale),
  tools: r.herramientas ?? [],
  fallback: !r.teoria_md[locale],
});

const ORDER = `ORDER BY array_position(ARRAY['principiante','intermedio','avanzado','experto'], c.nivel), c.slug`;

export async function listChallenges(locale: string): Promise<ChallengeView[]> {
  const rows = await query<Row>(`${SELECT} WHERE c.visible ${ORDER}`);
  return rows.map((r) => toView(r, locale));
}

export async function getChallenge(slug: string, locale: string): Promise<ChallengeView | null> {
  const rows = await query<Row>(`${SELECT} WHERE c.visible AND c.slug = $1`, [slug]);
  return rows[0] ? toView(rows[0], locale) : null;
}
