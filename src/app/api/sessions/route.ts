import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { checkSameOrigin, jsonError } from "@/lib/http";
import { createContainerSession, sessionUrl } from "@/lib/orchestrator";
import { enforce } from "@/lib/rate-limit";
import { logSessionEvent } from "@/lib/session-events";

const bodySchema = z.object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(64) });

type ChallengeRow = {
  id: string;
  imagen_docker: string;
  puerto: number;
  limites: { memoria_mb?: number; cpus?: number; pids?: number; timeout_inactividad_min?: number };
};

// Mi sesión activa (si existe).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("unauthorized", 401);
  const rows = await query<{ id: string; slug: string; expira_en: Date }>(
    `SELECT s.id, c.slug, s.expira_en FROM container_session s JOIN challenge c ON c.id = s.challenge_id
     WHERE s.user_id = $1 AND s.estado = 'activa' AND s.expira_en > now()`,
    [user.id],
  );
  return NextResponse.json({
    session: rows[0] ? { id: rows[0].id, slug: rows[0].slug, url: sessionUrl(rows[0].id), expiresAt: rows[0].expira_en } : null,
  });
}

// Inicia un reto en un contenedor propio y aislado.
export async function POST(req: Request) {
  if (!checkSameOrigin(req)) return jsonError("badRequest", 400);
  const user = await getCurrentUser();
  if (!user) return jsonError("unauthorized", 401);
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("invalidInput", 400);

  const limited = await enforce([{ name: "session-create", subject: user.id, max: 10, windowSec: 3600 }]);
  if (limited) return limited;

  const [challenge] = await query<ChallengeRow>(
    "SELECT id, imagen_docker, puerto, limites FROM challenge WHERE slug = $1 AND visible",
    [parsed.data.slug],
  );
  if (!challenge) return jsonError("notFound", 404);

  const sid = randomUUID();
  const flag = `CYBERLAB{${randomBytes(12).toString("hex")}}`;
  const idleMin = challenge.limites.timeout_inactividad_min ?? 30;

  try {
    // El índice único parcial garantiza una sesión activa por usuario, sin carreras.
    await query(
      `INSERT INTO container_session (id, user_id, challenge_id, estado, expira_en, flag_hash)
       VALUES ($1, $2, $3, 'iniciando', now() + make_interval(mins => $4), $5)`,
      [sid, user.id, challenge.id, idleMin, createHash("sha256").update(flag).digest("hex")],
    );
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return jsonError("activeSession", 409);
    console.error("session insert:", err);
    return jsonError("server", 500);
  }

  try {
    const { containerId } = await createContainerSession({
      sid,
      image: challenge.imagen_docker,
      port: challenge.puerto,
      limits: challenge.limites as Record<string, number>,
      env: { FLAG: flag },
    });
    await query("UPDATE container_session SET container_id = $2, estado = 'activa' WHERE id = $1", [sid, containerId]);
    await logSessionEvent(sid, user.id, "inicio", { reto: parsed.data.slug });
  } catch (err) {
    console.error("session create:", err);
    await query("UPDATE container_session SET estado = 'error', terminada_en = now() WHERE id = $1", [sid]);
    await logSessionEvent(sid, user.id, "error", { fase: "crear", mensaje: String(err) });
    return jsonError("server", 502);
  }

  return NextResponse.json({ id: sid, url: sessionUrl(sid) }, { status: 201 });
}
