import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getHints } from "@/lib/hints";
import { checkSameOrigin, jsonError } from "@/lib/http";
import { enforce } from "@/lib/rate-limit";

const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(64);
const bodySchema = z.object({ locale: z.enum(["es", "en"]).catch("es") });

// Desbloquea la siguiente pista (cada una reduce el XP del reto; ver lib/xp.ts).
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!checkSameOrigin(req)) return jsonError("badRequest", 400);
  const user = await getCurrentUser();
  if (!user) return jsonError("unauthorized", 401);
  const slug = slugSchema.safeParse((await params).slug);
  if (!slug.success) return jsonError("invalidInput", 400);
  const { locale } = bodySchema.parse(await req.json().catch(() => ({})));
  const limited = await enforce([{ name: "hint-user", subject: user.id, max: 30, windowSec: 600 }]);
  if (limited) return limited;

  const state = await getHints(user.id, slug.data, locale);
  if (!state) return jsonError("notFound", 404);
  if (state.completed) return jsonError("alreadyCompleted", 409); // sin sentido ni penalización tras completar
  if (state.unlocked >= state.total) return NextResponse.json(state);

  // Incremento atómico, acotado al total de pistas.
  await query(
    `INSERT INTO user_progress (user_id, challenge_id, estado, pistas_usadas)
     SELECT $1, c.id, 'en_progreso', 1 FROM challenge c WHERE c.slug = $2
     ON CONFLICT (user_id, challenge_id) DO UPDATE
       SET pistas_usadas = user_progress.pistas_usadas + 1
       WHERE user_progress.estado <> 'completado' AND user_progress.pistas_usadas < $3`,
    [user.id, slug.data, state.total],
  );
  return NextResponse.json(await getHints(user.id, slug.data, locale));
}
