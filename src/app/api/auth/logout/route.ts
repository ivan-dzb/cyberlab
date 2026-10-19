import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { checkSameOrigin, jsonError } from "@/lib/http";

export async function POST(req: Request) {
  if (!checkSameOrigin(req)) return jsonError("badRequest", 400);
  await destroySession();
  return NextResponse.json({ ok: true });
}
