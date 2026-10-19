import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// El cargador lee `process.cwd()/content/modules` al importarse: se prueba con un directorio temporal.
let tmp: string;

async function loadWithFixture(build: (modules: string) => void) {
  tmp = mkdtempSync(path.join(tmpdir(), "cyberlab-content-"));
  const modules = path.join(tmp, "content", "modules");
  mkdirSync(modules, { recursive: true });
  build(modules);
  vi.spyOn(process, "cwd").mockReturnValue(tmp);
  vi.resetModules();
  return import("./content");
}

const meta = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    id: "M99",
    slug: "m99-demo",
    titulo: { es: "Demo", en: "Demo en" },
    descripcion: { es: "d", en: "d" },
    nivel: "principiante",
    etapa: 1,
    prerrequisitos: [],
    tiempo_min: 10,
    ultima_revision: "2026-01-01",
    lecciones: ["01-uno"],
    ...over,
  });

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

describe("cargador de contenido con datos atípicos", () => {
  it("devuelve lista vacía si el directorio de módulos no existe", async () => {
    tmp = mkdtempSync(path.join(tmpdir(), "cyberlab-empty-"));
    vi.spyOn(process, "cwd").mockReturnValue(tmp);
    vi.resetModules();
    const { listModules } = await import("./content");
    expect(await listModules("es")).toEqual([]);
  });

  it("ignora carpetas sin module.json o con JSON inválido", async () => {
    const { listModules } = await loadWithFixture((m) => {
      mkdirSync(path.join(m, "sin-meta"));
      mkdirSync(path.join(m, "roto"));
      writeFileSync(path.join(m, "roto", "module.json"), "{no es json");
      mkdirSync(path.join(m, "m99-demo"));
      writeFileSync(path.join(m, "m99-demo", "module.json"), meta());
      writeFileSync(path.join(m, "m99-demo", "01-uno.es.md"), "---\ntitulo: Uno\n---\ncuerpo");
    });
    expect((await listModules("es")).map((x) => x.id)).toEqual(["M99"]);
  });

  it("ignora módulos cuyo slug no coincide con su carpeta (evita suplantación)", async () => {
    const { listModules } = await loadWithFixture((m) => {
      mkdirSync(path.join(m, "carpeta-a"));
      writeFileSync(path.join(m, "carpeta-a", "module.json"), meta({ slug: "carpeta-b" }));
    });
    expect(await listModules("es")).toEqual([]);
  });

  it("ignora carpetas con nombres no permitidos (mayúsculas, puntos, espacios)", async () => {
    const { listModules } = await loadWithFixture((m) => {
      for (const name of ["Mayus", ".oculta", "con espacio"]) {
        mkdirSync(path.join(m, name));
        writeFileSync(path.join(m, name, "module.json"), meta({ slug: name }));
      }
    });
    expect(await listModules("es")).toEqual([]);
  });

  it("si falta el archivo de una lección usa su slug como título", async () => {
    const { listModules } = await loadWithFixture((m) => {
      mkdirSync(path.join(m, "m99-demo"));
      writeFileSync(path.join(m, "m99-demo", "module.json"), meta());
    });
    expect((await listModules("es"))[0].lecciones).toEqual([{ slug: "01-uno", titulo: "01-uno" }]);
  });

  it("getLesson devuelve null si el archivo no existe en ningún idioma", async () => {
    const { getLesson } = await loadWithFixture((m) => {
      mkdirSync(path.join(m, "m99-demo"));
      writeFileSync(path.join(m, "m99-demo", "module.json"), meta());
    });
    expect(await getLesson("m99-demo", "01-uno", "es")).toBeNull();
  });

  it("usa la fecha del módulo si la lección no define ultima_revision", async () => {
    const { getLesson } = await loadWithFixture((m) => {
      mkdirSync(path.join(m, "m99-demo"));
      writeFileSync(path.join(m, "m99-demo", "module.json"), meta());
      writeFileSync(path.join(m, "m99-demo", "01-uno.es.md"), "---\ntitulo: Uno\n---\ncuerpo");
    });
    const l = await getLesson("m99-demo", "01-uno", "es");
    expect(l?.ultimaRevision).toBe("2026-01-01");
    expect(l?.tiempoMin).toBe(0);
  });

  it("ordena los módulos por id", async () => {
    const { listModules } = await loadWithFixture((m) => {
      for (const [dir, id] of [["m02-b", "M02"], ["m01-a", "M01"]]) {
        mkdirSync(path.join(m, dir));
        writeFileSync(path.join(m, dir, "module.json"), meta({ id, slug: dir }));
      }
    });
    expect((await listModules("es")).map((x) => x.id)).toEqual(["M01", "M02"]);
  });
});
