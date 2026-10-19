import { type BrowserContext, type Page } from "@playwright/test";
import { expect, FLAG_RE, openLab, registerViaApi, startChallenge, submitFlag, test } from "./fixtures";

/**
 * Resuelve cada reto como lo haría un estudiante, desde el navegador, y comprueba que la plataforma
 * acepta la bandera y otorga el XP. Cada test usa un usuario nuevo.
 */
async function complete(page: Page, xp: number, flag: string) {
  await page.bringToFront();
  await submitFlag(page, flag);
  await expect(page.getByText(`¡Correcto! +${xp} XP`)).toBeVisible();
  await expect(page.getByText(`Reto completado · ${xp} XP`)).toBeVisible();
}

const flagIn = async (page: Page) => (await page.content()).match(FLAG_RE)![0];
const textFlag = async (page: Page) => (await page.locator("body").innerText()).match(FLAG_RE)![0];

test.describe("resolver los retos desde el navegador", () => {
  test("bienvenida: la bandera está en un comentario del código fuente", async ({ page, context }) => {
    await registerViaApi(page);
    const lab = await openLab(context, await startChallenge(page, "bienvenida"));
    await complete(page, 10, await flagIn(lab));
  });

  test("robots-secretas: robots.txt delata la ruta interna (los señuelos no sirven)", async ({ page, context }) => {
    await registerViaApi(page);
    const url = await startChallenge(page, "robots-secretas");
    const lab = await openLab(context, url, "/robots.txt");
    await expect(lab.locator("body")).toContainText("Disallow: /archivos-internos/");
    expect((await lab.goto(`${url}/admin/`))?.status()).toBe(403); // señuelo
    await expect(lab.locator("body")).not.toContainText("CYBERLAB{");
    await lab.goto(`${url}/respaldo/`); // señuelo vacío
    await expect(lab.locator("body")).not.toContainText("CYBERLAB{");
    await lab.goto(`${url}/archivos-internos/`);
    await complete(page, 50, await textFlag(lab));
  });

  test("cookie-confiada: el rol vive en una cookie que el cliente puede cambiar", async ({ page, context }) => {
    await registerViaApi(page);
    const url = await startChallenge(page, "cookie-confiada");
    const lab = await openLab(context, url);
    await lab.getByLabel("Usuario").fill("invitado");
    await lab.getByLabel("Clave").fill("invitado");
    await lab.getByRole("button", { name: "Entrar" }).click();
    await expect(lab.locator("body")).toContainText("Tu rol: usuario");

    expect((await lab.goto(`${url}/admin`))?.status()).toBe(403); // sin cambiar la cookie no hay acceso
    await context.addCookies([{ name: "rol", value: "admin", url }]);
    await lab.goto(`${url}/admin`);
    await complete(page, 50, await textFlag(lab));
  });

  test("idor-facturas: el servidor no comprueba de quién es cada factura", async ({ page, context }) => {
    await registerViaApi(page);
    const url = await startChallenge(page, "idor-facturas");
    const lab = await openLab(context, url);
    expect((await lab.goto(`${url}/facturas`))?.status()).toBe(401); // sin sesión no hay acceso
    await lab.goto(url);
    await lab.getByLabel("Usuario").fill("ana");
    await lab.getByLabel("Clave").fill("ana2024");
    await lab.getByRole("button", { name: "Entrar" }).click();
    await expect(lab.locator("body")).toContainText("Factura #1042");
    await expect(lab.locator("body")).not.toContainText("#1001");
    await lab.goto(`${url}/facturas/1001`);
    await expect(lab.locator("body")).toContainText("Honorarios de consultoría");
    await complete(page, 50, await textFlag(lab));
  });

  test("login-ingenuo: inyección SQL (el error revela la consulta; admin'-- evade la clave)", async ({ page, context }) => {
    await registerViaApi(page);
    const lab = await openLab(context, await startChallenge(page, "login-ingenuo"));

    // una comilla rompe la consulta y el error la muestra
    await lab.getByLabel("Usuario").fill("'");
    await lab.getByLabel("Clave").fill("x");
    await lab.getByRole("button", { name: "Entrar" }).click();
    await expect(lab.locator("body")).toContainText("Error de base de datos");
    await expect(lab.locator("pre")).toContainText("SELECT usuario, rol FROM usuarios");

    // credenciales normales no dan acceso de administrador
    await lab.goto(lab.url().replace(/\/login$/, "/"));
    await lab.getByLabel("Usuario").fill("ana");
    await lab.getByLabel("Clave").fill("ana123");
    await lab.getByRole("button", { name: "Entrar" }).click();
    await expect(lab.locator("body")).toContainText("No tienes permisos de administrador");

    // la inyección
    await lab.goto(lab.url().replace(/\/login$/, "/"));
    await lab.getByLabel("Usuario").fill("admin'--");
    await lab.getByLabel("Clave").fill("cualquiera");
    await lab.getByRole("button", { name: "Entrar" }).click();
    await complete(page, 50, await textFlag(lab));
  });

  test("pin-debil: 10 000 combinaciones y ningún límite de intentos (fuerza bruta desde el navegador)", async ({ page, context }) => {
    test.setTimeout(150_000);
    await registerViaApi(page);
    const lab = await openLab(context, await startChallenge(page, "pin-debil"));
    const flag = await lab.evaluate(async () => {
      let next = 0;
      let found: string | null = null;
      async function worker() {
        while (found === null && next < 10_000) {
          const pin = String(next++).padStart(4, "0");
          const res = await fetch("/abrir", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: `pin=${pin}`,
          });
          const m = (await res.text()).match(/CYBERLAB\{[^}]+\}/);
          if (m) found = m[0];
        }
      }
      await Promise.all(Array.from({ length: 40 }, worker));
      return found;
    });
    expect(flag).toMatch(FLAG_RE);
    await complete(page, 50, flag!);
  });

  test("visor-de-archivos: ../ sale de la carpeta de documentos", async ({ page, context }) => {
    await registerViaApi(page);
    const url = await startChallenge(page, "visor-de-archivos");
    const lab = await openLab(context, url);
    await expect(lab.locator("body")).toContainText("Documentos públicos");
    await lab.goto(`${url}/ver?archivo=acerca.txt`);
    await expect(lab.locator("body")).toContainText("/tmp/secreto");
    await lab.goto(`${url}/ver?archivo=../../../tmp/secreto/flag.txt`);
    await complete(page, 50, await textFlag(lab));
  });
});

test.describe("el XP acumula entre retos y sube de nivel", () => {
  test("completar dos retos suma XP y el perfil lista ambos", async ({ page, context }) => {
    await registerViaApi(page);
    await solveBienvenida(page, context);
    await solveRobots(page, context);
    await expect(page.getByRole("link", { name: "Nv. 2 · 60 XP" })).toBeVisible();
    await page.goto("/es/profile");
    await expect(page.getByText("60 XP · 90 XP para el siguiente nivel")).toBeVisible();
    await expect(page.getByRole("link", { name: /Bienvenida/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Rutas que nadie debería ver/ })).toBeVisible();
  });
});

async function solveBienvenida(page: Page, context: BrowserContext) {
  const lab = await openLab(context, await startChallenge(page, "bienvenida"));
  await complete(page, 10, await flagIn(lab));
  await lab.close();
  await page.getByRole("button", { name: "Terminar" }).click();
  await expect(page.getByRole("button", { name: "Iniciar reto" })).toBeVisible({ timeout: 20_000 });
}

async function solveRobots(page: Page, context: BrowserContext) {
  const lab = await openLab(context, await startChallenge(page, "robots-secretas"), "/archivos-internos/");
  await complete(page, 50, await textFlag(lab));
  await lab.close();
}
