import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";

const ROOT = path.join(process.cwd(), "content", "modules");
const dirs = readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory());
const readJson = (p: string) => JSON.parse(readFileSync(p, "utf8"));

describe("contenido de módulos", () => {
  it("hay al menos un módulo publicado", () => expect(dirs.length).toBeGreaterThan(0));

  it("los ids de módulo son únicos y tienen el formato Mdd", () => {
    const ids = dirs.map((d) => readJson(path.join(ROOT, d.name, "module.json")).id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^M\d{2}$/);
  });

  describe.each(dirs.map((d) => d.name))("%s", (dir) => {
    const base = path.join(ROOT, dir);
    const meta = readJson(path.join(base, "module.json"));

    it("module.json es válido y su slug coincide con la carpeta", () => {
      expect(meta.slug).toBe(dir);
      expect(dir).toMatch(/^[a-z0-9][a-z0-9-]*$/);
      for (const f of ["titulo", "descripcion"]) {
        expect(meta[f].es?.length, `${f}.es`).toBeGreaterThan(0);
        expect(meta[f].en?.length, `${f}.en`).toBeGreaterThan(0);
      }
      expect(["principiante", "intermedio", "avanzado", "experto"]).toContain(meta.nivel);
      expect(Number.isInteger(meta.etapa)).toBe(true);
      expect(meta.tiempo_min).toBeGreaterThan(0);
      expect(meta.ultima_revision).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(meta.prerrequisitos)).toBe(true);
      expect(meta.lecciones.length).toBeGreaterThan(0);
    });

    it("tiene fuentes.md con las fuentes consultadas", () => {
      expect(existsSync(path.join(base, "fuentes.md"))).toBe(true);
      expect(readFileSync(path.join(base, "fuentes.md"), "utf8")).toMatch(/https?:\/\//);
    });

    it.each(["es", "en"])("cada lección existe en %s con frontmatter completo", (lang) => {
      for (const lesson of meta.lecciones as string[]) {
        expect(lesson, "slug de lección").toMatch(/^[a-z0-9][a-z0-9-]*$/);
        const file = path.join(base, `${lesson}.${lang}.md`);
        expect(existsSync(file), `${lesson}.${lang}.md`).toBe(true);
        const { data, content } = matter(readFileSync(file, "utf8"));
        expect(String(data.titulo ?? "").length, `${lesson}.${lang} titulo`).toBeGreaterThan(0);
        expect(Number(data.tiempo_min), `${lesson}.${lang} tiempo_min`).toBeGreaterThan(0);
        expect(data.ultima_revision, `${lesson}.${lang} ultima_revision`).toBeDefined();
        expect(content.length, `${lesson}.${lang} cuerpo`).toBeGreaterThan(300);
      }
    });

    it("no hay archivos de lección huérfanos (sin declarar en module.json)", () => {
      const declared = new Set(meta.lecciones as string[]);
      const lessonFiles = readdirSync(base).filter((f) => /\.(es|en)\.md$/.test(f));
      for (const f of lessonFiles) expect(declared.has(f.replace(/\.(es|en)\.md$/, "")), f).toBe(true);
    });

    it("las lecciones tienen el mismo número de secciones (##) en es y en", () => {
      for (const lesson of meta.lecciones as string[]) {
        const count = (lang: string) => (readFileSync(path.join(base, `${lesson}.${lang}.md`), "utf8").match(/^## /gm) ?? []).length;
        expect(count("en"), lesson).toBe(count("es"));
      }
    });

    it("la suma de minutos de las lecciones es coherente con el módulo (±40 %)", () => {
      const total = (meta.lecciones as string[]).reduce((s, l) => s + Number(matter(readFileSync(path.join(base, `${l}.es.md`), "utf8")).data.tiempo_min), 0);
      expect(Math.abs(total - meta.tiempo_min) / meta.tiempo_min).toBeLessThan(0.4);
    });

    it("las lecciones son contenido seguro: sin <script> ni HTML con eventos", () => {
      for (const f of readdirSync(base).filter((x) => x.endsWith(".md"))) {
        const text = readFileSync(path.join(base, f), "utf8");
        expect(text, f).not.toMatch(/<script/i);
        expect(text, f).not.toMatch(/\son\w+\s*=/i);
      }
    });
  });
});

describe("textos legales", () => {
  it.each(["es", "en"])("terms.%s.md tiene versión y título", (lang) => {
    const { data } = matter(readFileSync(path.join(process.cwd(), "content", "legal", `terms.${lang}.md`), "utf8"));
    expect(data.titulo).toBeTruthy();
    expect(data.version).toBeTruthy();
  });
});
