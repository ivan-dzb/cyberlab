import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/auth/schemas";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { checkSameOrigin, jsonError } from "@/lib/http";

export async function POST(req: Request) {
  if (!checkSameOrigin(req)) return jsonError("badRequest", 400);
  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("invalidInput", 400);

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const rows = await query<{ id: string }>(
      "INSERT INTO app_user (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id",
      [parsed.data.email, passwordHash],
    );
    // Mismo mensaje exista o no el correo: no se revela si ya hay una cuenta.
    if (!rows[0]) return jsonError("registerFailed", 400);
    await createSession(rows[0].id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("register:", err);
    return jsonError("server", 500);
  }
}
