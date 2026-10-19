import { expect, PASSWORD, randomIp, registerViaApi, registerViaUi, test, uniqueEmail } from "./fixtures";

const M08 = "/es/modules/m08-conceptos-seguridad";

test.describe("módulos y lecciones", () => {
  test("el catálogo lista M08 y navega a su página", async ({ page }) => {
    await page.goto("/es/modules");
    const card = page.getByRole("link", { name: /M08/ });
    await expect(card).toContainText("Conceptos y principios de seguridad");
    await expect(card).toContainText("Principiante");
    await card.click();
    await expect(page).toHaveURL(/m08-conceptos-seguridad$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Conceptos y principios de seguridad");
    await expect(page.getByText(/Revisado: 2026-10-18/)).toBeVisible();
  });

  test("el módulo lista sus 5 lecciones en orden", async ({ page }) => {
    await page.goto(M08);
    const lessons = page.locator("ol.lessons li a");
    await expect(lessons).toHaveCount(5);
    await expect(lessons.first()).toContainText("La tríada CIA");
    await expect(lessons.last()).toContainText("Vocabulario");
  });

  test("una lección se renderiza en Markdown (tabla, encabezados, código) y enlaza a fuentes", async ({ page }) => {
    await page.goto(`${M08}/05-vocabulario-de-vulnerabilidades`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("CVE, CWE, CVSS, EPSS y KEV");
    await expect(page.locator(".prose table").first()).toBeVisible();
    await expect(page.locator(".prose h2").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /FIRST – CVSS v4\.0 Specification/ })).toHaveAttribute("href", /first\.org\/cvss/);
    await expect(page.getByText("05 / 05")).toBeVisible();
  });

  test("la navegación anterior/siguiente recorre las lecciones", async ({ page }) => {
    await page.goto(`${M08}/02-riesgo`);
    await page.getByRole("link", { name: /Principios de diseño seguro →/ }).click();
    await expect(page).toHaveURL(/03-principios-de-diseno$/);
    await page.getByRole("link", { name: /← Riesgo/ }).click();
    await expect(page).toHaveURL(/02-riesgo$/);
  });

  test("lecciones o módulos inexistentes dan 404 (y no hay path traversal)", async ({ page }) => {
    for (const p of [`${M08}/99-nada`, "/es/modules/nope", `${M08}/..%2f..%2fetc`, "/es/modules/..%2f..%2fetc"]) {
      const res = await page.goto(p);
      expect(res?.status(), p).toBe(404);
    }
  });

  test("el contenido no ejecuta scripts: sin <script> inyectados en el cuerpo de la lección", async ({ page }) => {
    await page.goto(`${M08}/01-triada-cia`);
    expect(await page.locator(".prose script").count()).toBe(0);
  });

  test("la lección sin traducción mostraría aviso; las existentes no lo muestran", async ({ page }) => {
    await page.goto("/en/modules/m08-conceptos-seguridad/01-triada-cia");
    await expect(page.locator(".notice")).toHaveCount(0);
  });
});

test.describe("progreso de lecciones", () => {
  test("anónimo: se guarda en el navegador y sobrevive a la recarga", async ({ page }) => {
    await page.goto(`${M08}/01-triada-cia`);
    await page.getByRole("button", { name: "Marcar como completada" }).click();
    await expect(page.getByRole("button", { name: "Marcar como pendiente" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Marcar como pendiente" })).toBeVisible();
    await page.goto(M08);
    await expect(page.getByText("1/5 lecciones")).toBeVisible();
  });

  test("con sesión: se guarda en la cuenta y persiste aunque se borre el almacenamiento local", async ({ page }) => {
    await registerViaApi(page);
    await page.goto(`${M08}/02-riesgo`);
    await page.getByRole("button", { name: "Marcar como completada" }).click();
    await expect(page.getByRole("button", { name: "Marcar como pendiente" })).toBeVisible();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole("button", { name: "Marcar como pendiente" })).toBeVisible();
    await page.goto("/es/profile");
    await expect(page.getByRole("link", { name: /Riesgo: amenaza, vulnerabilidad e impacto/ })).toBeVisible();
  });

  test("desmarcar una lección la quita del perfil", async ({ page }) => {
    await registerViaApi(page);
    await page.goto(`${M08}/01-triada-cia`);
    await page.getByRole("button", { name: "Marcar como completada" }).click();
    await page.getByRole("button", { name: "Marcar como pendiente" }).click();
    await expect(page.getByRole("button", { name: "Marcar como completada" })).toBeVisible();
    await page.goto("/es/profile");
    await expect(page.getByText("Aún no has completado ninguna lección.")).toBeVisible();
  });

  test("el progreso anónimo se importa a la cuenta al registrarse", async ({ page }) => {
    await page.goto(`${M08}/03-principios-de-diseno`);
    await page.getByRole("button", { name: "Marcar como completada" }).click();
    await expect(page.getByRole("button", { name: "Marcar como pendiente" })).toBeVisible();

    await registerViaUi(page); // llega a /modules con sesión
    await page.goto(M08); // el almacén detecta la sesión e importa el progreso local
    await expect(page.getByText("1/5 lecciones")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("cyberlab:progress"))).toBeNull();
    await page.goto("/es/profile");
    await expect(page.getByRole("link", { name: /Principios de diseño seguro/ })).toBeVisible();
  });

  test("el progreso es por usuario: otra cuenta no lo ve", async ({ page, browser }) => {
    await registerViaApi(page);
    await page.goto(`${M08}/01-triada-cia`);
    await page.getByRole("button", { name: "Marcar como completada" }).click();
    await expect(page.getByRole("button", { name: "Marcar como pendiente" })).toBeVisible();

    const other = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });
    const p2 = await other.newPage();
    const res = await p2.request.post("/api/auth/register", { data: { email: uniqueEmail("otro"), password: PASSWORD, acceptTerms: true } });
    expect(res.status()).toBe(201);
    await p2.goto(`${M08}/01-triada-cia`);
    await expect(p2.getByRole("button", { name: "Marcar como completada" })).toBeVisible();
    await other.close();
  });

  test("la API rechaza claves de progreso que no existen en el contenido", async ({ page }) => {
    await registerViaApi(page);
    const res = await page.request.put("/api/progress", { data: { key: "../../etc/passwd", done: true } });
    expect(res.status()).toBe(400);
    const res2 = await page.request.put("/api/progress", { data: { key: "m08-conceptos-seguridad/99-nada", done: true } });
    expect(res2.status()).toBe(400);
  });
});
