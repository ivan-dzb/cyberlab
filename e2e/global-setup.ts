import { type FullConfig } from "@playwright/test";

/** Falla pronto y con un mensaje claro si la pila no está levantada. */
export default async function globalSetup(config: FullConfig) {
  const base = config.projects[0].use.baseURL ?? "http://localhost:3000";
  const deadline = Date.now() + 60_000;
  let last = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return;
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
