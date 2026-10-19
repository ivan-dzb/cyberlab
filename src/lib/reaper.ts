import "server-only";
import { getPool, query } from "@/lib/db";
import { destroyContainerSession, getActivity, listContainerSessions } from "@/lib/orchestrator";
import { logSessionEvent } from "@/lib/session-events";

const LOCK_ID = 7_340_001; // advisory lock: un solo reaper a la vez aunque haya varias instancias
const MAX_TOTAL_MIN = 120;
const HIGH_TRAFFIC_PER_TICK = 1200; // peticiones por intervalo antes de registrar 'trafico_alto'

const lastHits = new Map<string, number>();

type Active = { id: string; user_id: string; iniciado_en: Date; expira_en: Date; idle_min: number | null };

/**
 * 1. Extiende por actividad (inactividad real medida en el gateway).
 * 2. Destruye sesiones vencidas y las marca 'expirada'.
 * 3. Cierra 'iniciando' atascadas.
 * 4. Reconcilia con Docker: contenedores sin sesión activa en BD se destruyen.
 * 5. Limpia sesiones de autenticación y contadores caducados.
 */
export async function runReaper(): Promise<void> {
  const client = await getPool().connect();
  try {
    const { rows } = await client.query("SELECT pg_try_advisory_lock($1) AS ok", [LOCK_ID]);
    if (!rows[0].ok) return;
    try {
      await tick();
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [LOCK_ID]);
    }
  } finally {
    client.release();
  }
}

async function tick() {
  const activity = new Map((await getActivity().catch(() => [])).map((a) => [a.sid, a]));
  const active = await query<Active>(
    `SELECT s.id, s.user_id, s.iniciado_en, s.expira_en,
            (c.limites->>'timeout_inactividad_min')::int AS idle_min
     FROM container_session s JOIN challenge c ON c.id = s.challenge_id
     WHERE s.estado = 'activa'`,
  );

  for (const s of active) {
    const a = activity.get(s.id);
    if (!a) continue;
    // Actividad reciente => la inactividad se cuenta desde la última petición (con tope absoluto de 2 h).
    const idleMs = (s.idle_min ?? 30) * 60_000;
    const capMs = s.iniciado_en.getTime() + MAX_TOTAL_MIN * 60_000;
    const target = Math.min(a.lastSeen + idleMs, capMs);
    if (target > s.expira_en.getTime()) {
      await query("UPDATE container_session SET expira_en = $2 WHERE id = $1 AND estado = 'activa'", [s.id, new Date(target)]);
    }
    const prev = lastHits.get(s.id) ?? a.hits;
    lastHits.set(s.id, a.hits);
    if (a.hits - prev > HIGH_TRAFFIC_PER_TICK) {
      await logSessionEvent(s.id, s.user_id, "trafico_alto", { peticiones: a.hits - prev });
    }
  }

  // Vencidas.
  const expired = await query<{ id: string; user_id: string }>(
    "SELECT id, user_id FROM container_session WHERE estado = 'activa' AND expira_en < now()",
  );
  for (const s of expired) {
    try {
      await destroyContainerSession(s.id);
      await query("UPDATE container_session SET estado = 'expirada', terminada_en = now() WHERE id = $1", [s.id]);
      await logSessionEvent(s.id, s.user_id, "expiracion");
      lastHits.delete(s.id);
    } catch (err) {
      console.error("reaper destroy:", err);
      await logSessionEvent(s.id, s.user_id, "error", { fase: "reaper", mensaje: String(err) });
    }
  }

  // 'iniciando' atascadas (la app cayó a mitad de la creación).
  const stuck = await query<{ id: string; user_id: string }>(
    "SELECT id, user_id FROM container_session WHERE estado = 'iniciando' AND iniciado_en < now() - interval '2 minutes'",
  );
  for (const s of stuck) {
    await destroyContainerSession(s.id).catch(() => {});
    await query("UPDATE container_session SET estado = 'error', terminada_en = now() WHERE id = $1", [s.id]);
    await logSessionEvent(s.id, s.user_id, "error", { fase: "iniciando" });
  }

  // Huérfanos: contenedores en Docker sin sesión viva en BD.
  const live = new Set(
    (await query<{ id: string }>("SELECT id FROM container_session WHERE estado IN ('iniciando', 'activa')")).map((r) => r.id),
  );
  const nowSec = Date.now() / 1000;
  for (const c of await listContainerSessions().catch(() => [])) {
    if (!live.has(c.sid) && nowSec - c.created > 60) {
      console.warn(`reaper: destruyendo contenedor huérfano ${c.sid}`);
      await destroyContainerSession(c.sid).catch((e) => console.error("reaper orphan:", e));
      const [row] = await query<{ user_id: string }>("SELECT user_id FROM container_session WHERE id = $1", [c.sid]);
      if (row) await logSessionEvent(c.sid, row.user_id, "huerfana");
    }
  }

  await query("DELETE FROM auth_session WHERE expires_at < now()");
  await query("DELETE FROM rate_limit WHERE window_start < now() - interval '1 day'");
}

export function startReaper() {
  const every = Number(process.env.REAPER_INTERVAL_SEC ?? 60) * 1000;
  const loop = async () => {
    try {
      await runReaper();
    } catch (err) {
      console.error("reaper:", err);
    }
  };
  setTimeout(loop, 10_000); // primera pasada tras el arranque
  setInterval(loop, every).unref();
}
