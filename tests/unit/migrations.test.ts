import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DIR = path.join(process.cwd(), "db", "migrations");
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const sql = (f: string) => readFileSync(path.join(DIR, f), "utf8");
const all = files.map(sql).join("\n");

describe("migraciones", () => {
  it("están numeradas de forma contigua desde 0001", () => {
    files.forEach((f, i) => expect(f.slice(0, 4), f).toBe(String(i + 1).padStart(4, "0")));
  });
  it("siguen el patrón NNNN_descripcion_en_snake_case.sql", () => {
    for (const f of files) expect(f).toMatch(/^\d{4}_[a-z0-9_]+\.sql$/);
  });
  it("ninguna está vacía", () => {
    for (const f of files) expect(sql(f).trim().length, f).toBeGreaterThan(20);
  });
  it("no contienen datos personales ni secretos", () => {
    expect(all).not.toMatch(/INSERT INTO app_user|password_hash\s*=\s*'/i);
    expect(all).not.toMatch(/BEGIN (RSA )?PRIVATE KEY|AKIA[0-9A-Z]{16}/);
  });
  it("no usan transacciones propias (el runner ya envuelve cada migración)", () => {
    for (const f of files) expect(sql(f), f).not.toMatch(/^\s*(BEGIN|COMMIT)\s*;/im);
  });
  it("el esquema define todas las tablas del modelo", () => {
    for (const t of ["app_user", "challenge", "tool", "challenge_tool", "user_progress", "writeup", "container_session", "auth_session", "rate_limit", "lesson_progress", "session_event"]) {
      expect(all, t).toMatch(new RegExp(`CREATE (UNLOGGED )?TABLE ${t}\\b`));
    }
  });
  it("las contraseñas y tokens se guardan hasheados (columnas *_hash)", () => {
    expect(all).toMatch(/password_hash\s+text/);
    expect(all).toMatch(/token_hash\s+text PRIMARY KEY/);
    expect(all).toMatch(/flag_hash\s+text/);
  });
  it("hay un índice único parcial que limita a una sesión activa por usuario", () => {
    expect(all).toMatch(/CREATE UNIQUE INDEX uniq_container_session_active_user[\s\S]*WHERE estado IN \('iniciando', 'activa'\)/);
  });
  it("las claves foráneas a usuarios borran en cascada (derecho a eliminar datos)", () => {
    expect(all).toMatch(/user_id\s+uuid NOT NULL REFERENCES app_user\(id\) ON DELETE CASCADE/);
  });
  it("los CHECK acotan niveles, estados y tipos de evento", () => {
    expect(all).toMatch(/nivel IN \('principiante', 'intermedio', 'avanzado', 'experto'\)/);
    expect(all).toMatch(/estado IN \('no_iniciado', 'en_progreso', 'completado'\)/);
    expect(all).toMatch(/'bandera_ok'/);
  });
});
