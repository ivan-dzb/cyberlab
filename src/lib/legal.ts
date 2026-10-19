import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export const TOS_VERSION = "2026-10-18"; // debe coincidir con `version` en content/legal/terms.*.md

export async function getTerms(locale: string) {
  const l = locale === "en" ? "en" : "es";
  const raw = await readFile(path.join(process.cwd(), "content", "legal", `terms.${l}.md`), "utf8");
  const { data, content } = matter(raw);
  // YAML interpreta 2026-10-18 como Date.
  const version = data.version instanceof Date ? data.version.toISOString().slice(0, 10) : String(data.version);
  return { titulo: String(data.titulo), version, body: content };
}
