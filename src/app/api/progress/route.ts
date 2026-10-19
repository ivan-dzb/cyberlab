import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { listModules } from "@/lib/content";
import { query } from "@/lib/db";
import { checkSameOrigin, jsonError } from "@/lib/http";
import { enforce } from "@/lib/rate-limit";

const key = z.string().regex(/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*$/).max(200);
const putSchema = z.object({ key, done: z.boolean() });
const importSchema = z.object({ keys: z.array(key).max(500) });

/** Solo se aceptan lecciones que existen en el contenido (allowlist). */
async function validKeys(): Promise<Set<string>> {
  const modules = await listModules("es");
  return new Set(modules.flatMap((m) => m.lecciones.map((l) => `${m.slug}/${l.slug}`)));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("unauthorized", 401);
  const rows = await query<{ k: string }>(
    "SELECT module_slug || '/' || lesson_slug AS k FROM lesson_progress WHERE user_id = $1",
    [user.id],
  );
  return NextResponse.json({ keys: rows.map((r) => r.k) });
}

// Marca o desmarca una lección.
export async function PUT(req: Request) {
  if (!checkSameOrigin(req)) return jsonError("badRequest", 400);
  const user = await getCurrentUser();
  if (!user) return jsonError("unauthorized", 401);
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await validKeys()).has(parsed.data.key)) return jsonError("invalidInput", 400);
  const limited = await enforce([{ name: "progress-user", subject: user.id, max: 120, windowSec: 60 }]);
  if (limited) return limited;

  const [moduleSlug, lessonSlug] = parsed.data.key.split("/");
  if (parsed.data.done) {
    await query(
      "INSERT INTO lesson_progress (user_id, module_slug, lesson_slug) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
      [user.id, moduleSlug, lessonSlug],
    );
  } else {
    await query("DELETE FROM lesson_progress WHERE user_id = $1 AND module_slug = $2 AND lesson_slug = $3", [
      user.id,
      moduleSlug,
      lessonSlug,
    ]);
  }
  return NextResponse.json({ ok: true });
}

// Importa el progreso guardado en localStorage al iniciar sesión (ignora claves desconocidas).
export async function POST(req: Request) {
  if (!checkSameOrigin(req)) return jsonError("badRequest", 400);
  const user = await getCurrentUser();
  if (!user) return jsonError("unauthorized", 401);
  const parsed = importSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("invalidInput", 400);
  const valid = await validKeys();
  const keys = [...new Set(parsed.data.keys)].filter((k) => valid.has(k));
  if (keys.length) {
    await query(
      `INSERT INTO lesson_progress (user_id, module_slug, lesson_slug)
       SELECT $1, split_part(k, '/', 1), split_part(k, '/', 2) FROM unnest($2::text[]) AS k
       ON CONFLICT DO NOTHING`,
      [user.id, keys],
    );
  }
  return NextResponse.json({ imported: keys.length });
}
