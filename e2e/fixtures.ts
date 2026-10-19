import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, test as base, type BrowserContext, type Page } from "@playwright/test";

const rand = (n: number) => Math.floor(Math.random() * n);
const randomIp = () => `10.${rand(254) + 1}.${rand(254) + 1}.${rand(254) + 1}`;

export const PASSWORD = "correct-horse-battery";

/**
 * Cada test usa una IP de origen distinta (X-Forwarded-For) para no agotar el rate limiting por IP
 * (5 registros/hora) al crear muchos usuarios. El límite por cuenta no se ve afectado.
 */
export const test = base.extend<{ autoCleanup: void }>({
  extraHTTPHeaders: async ({}, use) => {
    await use({ "x-forwarded-for": randomIp() });
  },
  // Tras cada test se termina la sesión de reto que haya quedado activa (no dejar contenedores vivos).
  autoCleanup: [
    async ({ page }, use) => {
      await use();
      try {
        const res = await page.request.get("/api/sessions");
        const active = res.ok() ? (await res.json()).session : null;
        if (active) await page.request.delete(`/api/sessions/${active.id}`, { data: {} });
      } catch {
        // la página o el contexto ya se cerraron
      }
    },
    { auto: true },
  ],
});
export { expect };

export const uniqueEmail = (prefix = "e2e") => `${prefix}-${Date.now().toString(36)}-${rand(1e6).toString(36)}@example.test`;

/** Ejecuta SQL en la base de datos del stack (solo para preparar/inspeccionar estado en los tests). */
export function psql(sql: string): string {
  return execFileSync("docker", ["compose", "exec", "-T", "db", "psql", "-U", "cyberlab", "-tA", "-c", sql], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
  }).trim();
}

/** Crea una cuenta por la API usando el contexto de la página (queda con sesión iniciada). */
export async function registerViaApi(page: Page, email = uniqueEmail()) {
  const res = await page.request.post("/api/auth/register", { data: { email, password: PASSWORD, acceptTerms: true } });
  expect(res.status(), await res.text()).toBe(201);
  return email;
}

/** Registro por la interfaz. */
export async function registerViaUi(page: Page, email = uniqueEmail()) {
  await page.goto("/es/register");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL("**/es/modules");
  return email;
}

/** Inicia un reto desde la interfaz y devuelve la URL de su origen aislado. */
export async function startChallenge(page: Page, slug: string, locale = "es"): Promise<string> {
  await page.goto(`/${locale}/challenges/${slug}`);
  await page.getByRole("button", { name: /iniciar reto|start challenge/i }).click();
  const open = page.getByRole("link", { name: /abrir reto|open challenge/i });
  await expect(open).toBeVisible({ timeout: 30_000 });
  const href = (await open.getAttribute("href"))!;
  expect(href).toMatch(/^http:\/\/[0-9a-f-]{36}\.lab\.localhost:8081$/);
  return href;
}

/** Abre el reto en una pestaña nueva (origen distinto al de la plataforma) esperando a que responda. */
export async function openLab(context: BrowserContext, url: string, path = "/"): Promise<Page> {
  const lab = await context.newPage();
  for (let i = 0; i < 20; i++) {
    const res = await lab.goto(url + path, { waitUntil: "domcontentloaded" }).catch(() => null);
    if (res && ![502, 503].includes(res.status())) return lab;
    await lab.waitForTimeout(500);
  }
  throw new Error(`el reto no respondió: ${url}`);
}

export async function submitFlag(page: Page, flag: string) {
  await page.getByPlaceholder("CYBERLAB{...}").fill(flag);
  await page.getByRole("button", { name: "Enviar" }).click();
}

export async function endSession(page: Page) {
  const end = page.getByRole("button", { name: "Terminar" });
  if (await end.isVisible().catch(() => false)) {
    await end.click();
    await expect(page.getByRole("button", { name: "Iniciar reto" })).toBeVisible({ timeout: 20_000 });
  }
}

export const FLAG_RE = /CYBERLAB\{[^}]+\}/;

/** Contenedores de reto vivos para una sesión (consulta directa a Docker). */
export function liveContainers(sid: string): number {
  const out = execFileSync("docker", ["ps", "-q", "--filter", `label=cyberlab.session=${sid}`], { encoding: "utf8" }).trim();
  return out ? out.split("\n").length : 0;
}

export function dockerCompose(...args: string[]) {
  execFileSync("docker", ["compose", ...args], { cwd: path.resolve(__dirname, ".."), stdio: "ignore" });
}
