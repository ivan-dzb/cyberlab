import "server-only";
import { NextResponse } from "next/server";

export const jsonError = (error: string, status: number, headers?: Record<string, string>) =>
  NextResponse.json({ error }, { status, headers });

/**
 * Defensa CSRF adicional a SameSite=Lax: en peticiones que modifican estado exige
 * Content-Type JSON y que Origin (si viene) coincida con el Host.
 */
export function checkSameOrigin(req: Request): boolean {
  if (!req.headers.get("content-type")?.includes("application/json")) return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export function clientIp(req: Request): string {
  // Detrás de un proxy de confianza se usa el primer valor de X-Forwarded-For.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
