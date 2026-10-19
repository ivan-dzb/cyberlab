import "server-only";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const MODULES_DIR = path.join(process.cwd(), "content", "modules");
const DEFAULT_LOCALE = "es";

export type Nivel = "principiante" | "intermedio" | "avanzado" | "experto";
type I18n = Record<string, string>;

type ModuleFile = {
  id: string; // ej. "M08"
  slug: string; // ej. "m08-conceptos-seguridad"
  titulo: I18n;
  descripcion: I18n;
  nivel: Nivel;
  etapa: number;
  prerrequisitos: string[];
  tiempo_min: number;
  ultima_revision: string;
  lecciones: string[]; // slugs en orden
};

export type ModuleSummary = {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string;
  nivel: Nivel;
  etapa: number;
  prerrequisitos: string[];
  tiempoMin: number;
  ultimaRevision: string;
  lecciones: { slug: string; titulo: string }[];
};

export type Lesson = {
  slug: string;
  titulo: string;
  tiempoMin: number;
  ultimaRevision: string;
  body: string;
  /** true si no existe en el idioma pedido y se usa el español. */
  fallback: boolean;
};

const SAFE = /^[a-z0-9][a-z0-9-]*$/;

function pick(text: I18n, locale: string): string {
  return text[locale] ?? text[DEFAULT_LOCALE] ?? "";
}

async function readLessonFile(moduleSlug: string, lessonSlug: string, locale: string) {
  // Los slugs provienen de module.json (confiable), nunca directamente del request.
  for (const l of locale === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [locale, DEFAULT_LOCALE]) {
    const file = path.join(MODULES_DIR, moduleSlug, `${lessonSlug}.${l}.md`);
    try {
      return { raw: await readFile(file, "utf8"), fallback: l !== locale };
    } catch {
      // probar el siguiente idioma
    }
  }
  return null;
}

async function lessonTitle(moduleSlug: string, lessonSlug: string, locale: string) {
  const file = await readLessonFile(moduleSlug, lessonSlug, locale);
  if (!file) return lessonSlug;
  return String(matter(file.raw).data.titulo ?? lessonSlug);
}

export async function listModules(locale: string): Promise<ModuleSummary[]> {
  let entries: string[];
  try {
    entries = await readdir(MODULES_DIR);
  } catch {
    return [];
  }
  const modules: ModuleSummary[] = [];
  for (const dir of entries.filter((d) => SAFE.test(d))) {
    let meta: ModuleFile;
    try {
      meta = JSON.parse(await readFile(path.join(MODULES_DIR, dir, "module.json"), "utf8"));
    } catch {
      continue;
    }
    if (meta.slug !== dir) continue;
    modules.push({
      id: meta.id,
      slug: meta.slug,
      titulo: pick(meta.titulo, locale),
      descripcion: pick(meta.descripcion, locale),
      nivel: meta.nivel,
      etapa: meta.etapa,
      prerrequisitos: meta.prerrequisitos,
      tiempoMin: meta.tiempo_min,
      ultimaRevision: meta.ultima_revision,
      lecciones: await Promise.all(
        meta.lecciones.map(async (s) => ({ slug: s, titulo: await lessonTitle(meta.slug, s, locale) })),
      ),
    });
  }
  return modules.sort((a, b) => a.id.localeCompare(b.id));
}

export async function getModule(slug: string, locale: string) {
  return (await listModules(locale)).find((m) => m.slug === slug) ?? null;
}

export async function getLesson(
  moduleSlug: string,
  lessonSlug: string,
  locale: string,
): Promise<Lesson | null> {
  const mod = await getModule(moduleSlug, locale);
  if (!mod || !mod.lecciones.some((l) => l.slug === lessonSlug)) return null; // allowlist
  const file = await readLessonFile(mod.slug, lessonSlug, locale);
  if (!file) return null;
  const { data, content } = matter(file.raw);
  return {
    slug: lessonSlug,
    titulo: String(data.titulo ?? lessonSlug),
    tiempoMin: Number(data.tiempo_min ?? 0),
    // YAML interpreta 2026-10-18 como Date; normalizar a ISO (YYYY-MM-DD).
    ultimaRevision:
      data.ultima_revision instanceof Date
        ? data.ultima_revision.toISOString().slice(0, 10)
        : String(data.ultima_revision ?? mod.ultimaRevision),
    body: content,
    fallback: file.fallback,
  };
}
