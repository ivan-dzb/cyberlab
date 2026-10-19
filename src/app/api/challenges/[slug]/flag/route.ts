import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { checkSameOrigin, jsonError } from "@/lib/http";
import { enforce } from "@/lib/rate-limit";
import { logSessionEvent } from "@/lib/session-events";
import { xpFor } from "@/lib/xp";

const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(64);
const bodySchema = z.object({ flag: z.string().trim().min(1).max(200) });

type Row = { session_id: string; flag_hash: string; challenge_id: string; xp: number };

// Envía la bandera de MI sesión activa de este reto.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!checkSameOrigin(req)) return jsonError("badRequest", 400);
  const user = await getCurrentUser();
  if (!user) return jsonError("unauthorized", 401);
  const slug = slugSchema.safeParse((await params).slug);
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!slug.success || !body.success) return jsonError("invalidInput", 400);

  // Frena la adivinanza por fuerza bruta de la bandera.
  const limited = await enforce([{ name: "flag-user", subject: user.id, max: 20, windowSec: 600 }]);
  if (limited) return limited;

  const [row] = await query<Row>(
    `SELECT s.id AS session_id, s.flag_hash, c.id AS challenge_id, c.xp
     FROM container_session s JOIN challenge c ON c.id = s.challenge_id
     WHERE s.user_id = $1 AND c.slug = $2 AND c.visible AND s.estado = 'activa' AND s.expira_en > now()`,
    [user.id, slug.data],
  );
  if (!row) return jsonError("noSession", 404);

  // Comparación en tiempo constante de los hashes.
  const given = createHash("sha256").update(body.data.flag).digest();
  const want = Buffer.from(row.flag_hash, "hex");
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return NextResponse.json({ correct: false });
  }

  const [prog] = await query<{ estado: string; pistas_usadas: number }>(
    "SELECT estado, pistas_usadas FROM user_progress WHERE user_id = $1 AND challenge_id = $2",
    [user.id, row.challenge_id],
  );
  if (prog?.estado === "completado") return NextResponse.json({ correct: true, already: true, xp: 0 });

  const xp = xpFor(row.xp, prog?.pistas_usadas ?? 0);
  await query(
    `INSERT INTO user_progress (user_id, challenge_id, estado, xp_otorgado, completado_en)
     VALUES ($1, $2, 'completado', $3, now())
     ON CONFLICT (user_id, challenge_id) DO UPDATE
       SET estado = 'completado', xp_otorgado = $3, completado_en = now()
       WHERE user_progress.estado <> 'completado'`,
    [user.id, row.challenge_id, xp],
  );
  await logSessionEvent(row.session_id, user.id, "bandera_ok", { xp });
  return NextResponse.json({ correct: true, already: false, xp });
}
