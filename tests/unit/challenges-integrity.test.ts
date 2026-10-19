import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";

const ROOT = path.join(process.cwd(), "challenges");
const dirs = readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "_template").map((d) => d.name);
const visible = dirs.filter((d) => !d.startsWith("_"));

// Mismo esquema que scripts/sync-challenges.mjs (si cambia uno, este test debe fallar).
const i18n = z.object({ es: z.string().min(1), en: z.string().min(1) });
const schema = z.object({
  slug: z.string().regex(/^_?[a-z0-9][a-z0-9-]*$/),
  titulo: i18n,
  descripcion: i18n,
  nivel: z.enum(["principiante", "intermedio", "avanzado", "experto"]),
  xp: z.number().int().min(0),
  herramientas: z.array(z.string()),
  imagen_docker: z.string().regex(/^[a-z0-9][a-z0-9._/-]*(:[A-Za-z0-9._-]+)?$/),
  puerto: z.number().int().min(1).max(65535),
  limites: z.object({
    memoria_mb: z.number().int().min(16).max(1024),
    cpus: z.number().min(0.1).max(2),
    pids: z.number().int().min(16).max(512),
    timeout_inactividad_min: z.number().int().min(5).max(120),
  }),
});

const read = (d: string, f: string) => readFileSync(path.join(ROOT, d, f), "utf8");
const hints = (d: string, l: string) => read(d, `pistas.${l}.md`).split(/^---\s*$/m).map((x) => x.trim()).filter(Boolean);
const filesIn = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? filesIn(p) : [p];
  });

describe("retos: la plantilla", () => {
  it("la plantilla es válida para el esquema de sincronización", () => {
    const tpl = JSON.parse(readFileSync(path.join(ROOT, "_template", "challenge.json"), "utf8"));
    expect(schema.safeParse(tpl).success).toBe(true);
  });
  it("la plantilla incluye todos los archivos que se exigen a un reto", () => {
    for (const f of ["challenge.json", "Dockerfile", "teoria.es.md", "teoria.en.md", "pistas.es.md", "pistas.en.md", "solve.mjs"]) {
      expect(existsSync(path.join(ROOT, "_template", f)), f).toBe(true);
    }
  });
});

describe.each(dirs)("reto %s", (dir) => {
  const meta = JSON.parse(read(dir, "challenge.json"));

  it("challenge.json cumple el esquema y su slug coincide con la carpeta", () => {
    const parsed = schema.safeParse(meta);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(meta.slug).toBe(dir);
  });

  it("la imagen se llama cyberlab/<nombre>:<tag> (el orquestador rechaza otras)", () => {
    expect(meta.imagen_docker).toMatch(/^cyberlab\/[a-z0-9][a-z0-9-]*:[A-Za-z0-9._-]+$/);
  });

  it("los límites de recursos son razonables para un reto", () => {
    expect(meta.limites.memoria_mb).toBeLessThanOrEqual(256);
    expect(meta.limites.cpus).toBeLessThanOrEqual(1);
    expect(meta.limites.pids).toBeLessThanOrEqual(128);
  });

  it("tiene Dockerfile con base fijada, sin latest, y escucha en el puerto declarado", () => {
    const df = read(dir, "Dockerfile");
    expect(df).toMatch(/^FROM\s+\S+:\S+/m);
    expect(df).not.toMatch(/^FROM\s+\S+:latest/m);
    expect(df).toMatch(new RegExp(`EXPOSE\\s+${meta.puerto}\\b`));
    expect(df).not.toMatch(/curl[^\n]*\|\s*(sh|bash)/);
    expect(df).not.toMatch(/--privileged|docker\.sock/);
  });

  it("tiene teoría en español", () => {
    expect(read(dir, "teoria.es.md").length).toBeGreaterThan(30);
  });
});

describe.each(visible)("reto visible %s", (dir) => {
  const meta = JSON.parse(read(dir, "challenge.json"));

  it("tiene teoría, pistas y writeup en ambos idiomas", () => {
    for (const f of ["teoria", "pistas", "writeup"]) {
      for (const l of ["es", "en"]) expect(existsSync(path.join(ROOT, dir, `${f}.${l}.md`)), `${f}.${l}.md`).toBe(true);
    }
  });

  it("la teoría no repite el título como H1 (lo pone la página)", () => {
    for (const l of ["es", "en"]) expect(read(dir, `teoria.${l}.md`)).not.toMatch(/^# /m);
  });

  it("tiene entre 3 y 5 pistas y el mismo número en es y en", () => {
    const es = hints(dir, "es");
    expect(es.length).toBeGreaterThanOrEqual(3);
    expect(es.length).toBeLessThanOrEqual(5);
    expect(hints(dir, "en")).toHaveLength(es.length);
  });

  it("el writeup explica la solución, lo aprendido y la mitigación", () => {
    expect(read(dir, "writeup.es.md")).toMatch(/## Solución/);
    expect(read(dir, "writeup.es.md")).toMatch(/## Qué aprendiste/);
    expect(read(dir, "writeup.es.md")).toMatch(/## Cómo se evita/);
    expect(read(dir, "writeup.en.md")).toMatch(/## Solution/);
    expect(read(dir, "writeup.en.md")).toMatch(/## What you learned/);
    expect(read(dir, "writeup.en.md")).toMatch(/## How to prevent it/);
  });

  it("la teoría no revela la solución exacta (solo el writeup puede)", () => {
    for (const l of ["es", "en"]) expect(read(dir, `teoria.${l}.md`)).not.toMatch(/admin'--|\.\.\/\.\.\/\.\.\/tmp|rol=admin/);
  });

  it("tiene solve.mjs que exporta una función por defecto", () => {
    const solve = read(dir, "solve.mjs");
    expect(solve).toMatch(/export default/);
  });

  it("el XP es positivo", () => expect(meta.xp).toBeGreaterThan(0));

  it("la app lee la bandera de FLAG y no la tiene incrustada", () => {
    const sources = filesIn(path.join(ROOT, dir, "app")).filter((f) => /\.(js|mjs|cjs|json|txt|html)$/.test(f));
    const text = sources.map((f) => readFileSync(f, "utf8")).join("\n");
    expect(text).toMatch(/process\.env\.FLAG/);
    const literal = [...text.matchAll(/CYBERLAB\{([^}$]*)\}/g)].map((m) => m[1]);
    expect(literal.every((l) => l === "sin-bandera-en-local"), `banderas incrustadas: ${literal}`).toBe(true);
  });

  it("la app no pide recursos externos ni usa APIs peligrosas del sistema", () => {
    const sources = filesIn(path.join(ROOT, dir, "app")).filter((f) => f.endsWith(".js"));
    const text = sources.map((f) => readFileSync(f, "utf8")).join("\n");
    expect(text).not.toMatch(/child_process|execSync|spawn\(|eval\(|new Function\(/);
    expect(text).not.toMatch(/https?:\/\/(?!x["'/])(?!localhost)[a-z0-9.-]+\.[a-z]{2,}/i);
  });

  it("no hay secretos reales en la carpeta del reto", () => {
    for (const f of filesIn(path.join(ROOT, dir))) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}/);
    }
  });
});

describe("conjunto de retos", () => {
  it("los slugs son únicos y las imágenes también", () => {
    const images = dirs.map((d) => JSON.parse(read(d, "challenge.json")).imagen_docker);
    expect(new Set(images).size).toBe(images.length);
  });
  it("existe el canario de aislamiento y está oculto (prefijo _)", () => {
    expect(dirs).toContain("_canary");
  });
  it("hay retos de nivel principiante publicados (Fase 2)", () => {
    const levels = visible.map((d) => JSON.parse(read(d, "challenge.json")).nivel);
    expect(levels.filter((l) => l === "principiante").length).toBeGreaterThanOrEqual(7);
  });
});
