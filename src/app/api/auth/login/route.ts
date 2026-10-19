import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/auth/schemas";
import { dummyHash, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { checkSameOrigin, jsonError } from "@/lib/http";

export async function POST(req: Request) {
  if (!checkSameOrigin(req)) return jsonError("badRequest", 400);
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("invalidCredentials", 401);

  try {
    const rows = await query<{ id: string; password_hash: string }>(
      "SELECT id, password_hash FROM app_user WHERE email = $1",
      [parsed.data.email],
    );
    const user = rows[0];
    // Se verifica siempre un hash (real o ficticio) para no filtrar por tiempo si el correo existe.
    const ok = await verifyPassword(parsed.data.password, user?.password_hash ?? (await dummyHash()));
    if (!user || !ok) return jsonError("invalidCredentials", 401);
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("login:", err);
    return jsonError("server", 500);
  }
}
