import { type FullConfig } from "@playwright/test";

/** El servidor de desarrollo compila cada ruta en su primera visita: se precalientan para que los tests no agoten el tiempo. */
async function warmUp(base: string) {
  const paths = [
    "/es", "/en", "/es/modules", "/es/modules/m08-conceptos-seguridad", "/es/modules/m08-conceptos-seguridad/01-triada-cia",
    "/es/challenges", "/es/challenges/bienvenida", "/es/login", "/es/register", "/es/terms", "/es/profile",
    "/api/progress", "/api/sessions", "/api/auth/login", "/api/auth/register", "/api/auth/logout",
    "/api/challenges/bienvenida/status", "/api/challenges/bienvenida/hints", "/api/challenges/bienvenida/flag",
  ];
  for (const p of paths) await fetch(`${base}${p}`, { redirect: "manual" }).catch(() => undefined);
}

/** Falla pronto y con un mensaje claro si la pila no está levantada. */
export default async function globalSetup(config: FullConfig) {
  const base = config.projects[0].use.baseURL ?? "http://localhost:3000";
  const deadline = Date.now() + 60_000;
  let last = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return warmUp(base);
      last = `HTTP ${res.status}`;
    } catch (err) {
      last = String(err);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `La aplicación no responde en ${base} (${last}).\n` +
      "Levanta la pila antes de correr los e2e:\n" +
      "  npm run build:challenges && docker compose up -d --build\n" +
      "  docker compose exec app npm run migrate && docker compose exec app npm run sync:challenges",
  );
}
