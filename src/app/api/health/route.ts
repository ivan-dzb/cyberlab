import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await query("SELECT 1");
    return NextResponse.json({ status: "ok", db: "up" });
  } catch (err) {
    console.error("health: fallo de BD", err);
    return NextResponse.json({ error: "base de datos no disponible" }, { status: 503 });
  }
}
