import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getHints } from "@/lib/hints";
import { jsonError } from "@/lib/http";

const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(64);
const localeSchema = z.enum(["es", "en"]).catch("es");

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("unauthorized", 401);
  const slug = slugSchema.safeParse((await params).slug);
  if (!slug.success) return jsonError("invalidInput", 400);
  const locale = localeSchema.parse(new URL(req.url).searchParams.get("locale"));
  const state = await getHints(user.id, slug.data, locale);
  if (!state) return jsonError("notFound", 404);
  return NextResponse.json(state);
}
