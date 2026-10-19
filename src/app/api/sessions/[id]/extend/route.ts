import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { checkSameOrigin, jsonError } from "@/lib/http";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EXTEND_MIN = 30;
const MAX_TOTAL_MIN = 120; // duración máxima absoluta de una sesión

// Extiende 30 min la sesión (sin pasar de 2 h desde su inicio).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkSameOrigin(req)) return jsonError("badRequest", 400);
  const user = await getCurrentUser();
  if (!user) return jsonError("unauthorized", 401);
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("notFound", 404);

  const rows = await query<{ expira_en: Date }>(
    `UPDATE container_session
     SET expira_en = LEAST(now() + make_interval(mins => $3), iniciado_en + make_interval(mins => $4))
     WHERE id = $1 AND user_id = $2 AND estado = 'activa' AND expira_en > now()
     RETURNING expira_en`,
    [id, user.id, EXTEND_MIN, MAX_TOTAL_MIN],
  );
  if (!rows[0]) return jsonError("notFound", 404);
  return NextResponse.json({ expiresAt: rows[0].expira_en });
}
