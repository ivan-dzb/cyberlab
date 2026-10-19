import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { checkSameOrigin, jsonError } from "@/lib/http";
import { destroyContainerSession } from "@/lib/orchestrator";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Termina mi sesión: destruye contenedor y red.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!checkSameOrigin(req)) return jsonError("badRequest", 400);
  const user = await getCurrentUser();
  if (!user) return jsonError("unauthorized", 401);
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("notFound", 404);

  // Solo el dueño puede terminarla.
  const rows = await query<{ id: string }>(
    "SELECT id FROM container_session WHERE id = $1 AND user_id = $2 AND estado IN ('iniciando', 'activa')",
    [id, user.id],
  );
  if (!rows[0]) return jsonError("notFound", 404);

  try {
    await destroyContainerSession(id);
  } catch (err) {
    console.error("session destroy:", err);
    return jsonError("server", 502);
  }
  await query("UPDATE container_session SET estado = 'terminada', terminada_en = now() WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
