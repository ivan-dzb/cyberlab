import "server-only";
import { query } from "@/lib/db";

export type SessionEventType = "inicio" | "extension" | "fin" | "expiracion" | "error" | "trafico_alto" | "huerfana";

/** Registra un evento de sesión. Nunca debe romper el flujo principal. */
export async function logSessionEvent(
  sessionId: string,
  userId: string,
  tipo: SessionEventType,
  detalle: Record<string, unknown> = {},
): Promise<void> {
  try {
    await query("INSERT INTO session_event (session_id, user_id, tipo, detalle) VALUES ($1, $2, $3, $4)", [
      sessionId,
      userId,
      tipo,
      detalle,
    ]);
  } catch (err) {
    console.error("session event:", err);
  }
}
