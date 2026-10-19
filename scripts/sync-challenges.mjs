// Sincroniza challenges/<slug>/ (challenge.json + teoria.{es,en}.md) con la BD.
// Slugs con prefijo "_" (plantilla, canario) se sincronizan pero quedan ocultos del catálogo.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { z } from "zod";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "challenges");
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

const read = (p) => readFile(p, "utf8").catch(() => null);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL no está definida");
  process.exit(1);
}
const client = new pg.Client({ connectionString });
await client.connect();
let failed = false;

try {
  const dirs = (await readdir(root, { withFileTypes: true })).filter((d) => d.isDirectory() && d.name !== "_template");
  for (const dir of dirs) {
    const raw = await read(path.join(root, dir.name, "challenge.json"));
    if (!raw) continue;
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.error(`✗ ${dir.name}: challenge.json inválido`, parsed.error.issues);
      failed = true;
      continue;
    }
    const c = parsed.data;
    if (c.slug !== dir.name) {
      console.error(`✗ ${dir.name}: el slug (${c.slug}) debe coincidir con la carpeta`);
      failed = true;
      continue;
    }
    const teoria = {};
    for (const l of ["es", "en"]) {
      const t = await read(path.join(root, dir.name, `teoria.${l}.md`));
      if (t) teoria[l] = t;
    }
    // Pistas: un archivo por idioma, pistas separadas por una línea "---".
    const pistas = {};
    const writeup = {};
    for (const l of ["es", "en"]) {
      const p = await read(path.join(root, dir.name, `pistas.${l}.md`));
      if (p) pistas[l] = p.split(/^---\s*$/m).map((x) => x.trim()).filter(Boolean);
      const w = await read(path.join(root, dir.name, `writeup.${l}.md`));
      if (w) writeup[l] = w;
    }
    if (pistas.es && pistas.en && pistas.es.length !== pistas.en.length) {
      console.error(`✗ ${dir.name}: pistas es (${pistas.es.length}) y en (${pistas.en.length}) deben tener el mismo número`);
      failed = true;
      continue;
    }
    if ((pistas.es ?? []).length > 5) {
      console.error(`✗ ${dir.name}: máximo 5 pistas`);
      failed = true;
      continue;
    }
    if (!teoria.es) {
      console.error(`✗ ${dir.name}: falta teoria.es.md`);
      failed = true;
      continue;
    }

    await client.query("BEGIN");
    try {
      const { rows } = await client.query(
        `INSERT INTO challenge (slug, titulo, descripcion, nivel, teoria_md, imagen_docker, xp, puerto, limites, visible, pistas, writeup)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (slug) DO UPDATE SET titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion,
           nivel = EXCLUDED.nivel, teoria_md = EXCLUDED.teoria_md, imagen_docker = EXCLUDED.imagen_docker,
           xp = EXCLUDED.xp, puerto = EXCLUDED.puerto, limites = EXCLUDED.limites, visible = EXCLUDED.visible,
           pistas = EXCLUDED.pistas, writeup = EXCLUDED.writeup
         RETURNING id`,
        [c.slug, c.titulo, c.descripcion, c.nivel, teoria, c.imagen_docker, c.xp, c.puerto, c.limites, !c.slug.startsWith("_"), pistas, writeup],
      );
      const id = rows[0].id;
      await client.query("DELETE FROM challenge_tool WHERE challenge_id = $1", [id]);
      for (const tool of c.herramientas) {
        const r = await client.query(
          "INSERT INTO challenge_tool (challenge_id, tool_id) SELECT $1, id FROM tool WHERE slug = $2",
          [id, tool],
        );
        if (r.rowCount === 0) console.warn(`  ! ${c.slug}: herramienta "${tool}" no existe en el catálogo (add-tool)`);
      }
      await client.query("COMMIT");
      console.log(`✓ ${c.slug}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }
} finally {
  await client.end();
}
if (failed) process.exit(1);
