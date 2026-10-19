import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { jsonError } from "@/lib/http";

const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(64);

// Mi estado en este reto.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("unauthorized", 401);
  const slug = slugSchema.safeParse((await params).slug);
  if (!slug.success) return jsonError("invalidInput", 400);

  const [row] = await query<{ estado: string; xp_otorgado: number; pistas_usadas: number }>(
    `SELECT p.estado, p.xp_otorgado, p.pistas_usadas
     FROM user_progress p JOIN challenge c ON c.id = p.challenge_id
     WHERE p.user_id = $1 AND c.slug = $2`,
    [user.id, slug.data],
  );
  return NextResponse.json({
    completed: row?.estado === "completado",
    xp: row?.xp_otorgado ?? 0,
    hintsUsed: row?.pistas_usadas ?? 0,
  });
}
