import { expect, test } from "./fixtures";

test.describe("humo: la plataforma responde", () => {
  test("health: la app y la base de datos están arriba", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", db: "up" });
  });

  test("/ redirige al idioma por defecto (es)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });

  test("la home muestra titular, estadísticas y el mapa de módulos", async ({ page }) => {
    await page.goto("/es");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Aprende ciberseguridad");
    await expect(page.getByRole("link", { name: "Ver módulos" })).toBeVisible();
    await expect(page.getByText("módulos planeados")).toBeVisible();
    await expect(page.getByRole("img", { name: /mapa de las nueve etapas/i })).toBeVisible();
    // M08 está publicado: su nodo enlaza al módulo
    await page.locator('svg a[href$="/modules/m08-conceptos-seguridad"]').click();
    await expect(page).toHaveURL(/\/modules\/m08-conceptos-seguridad$/);
  });

  test("el pie de página muestra el aviso de uso educativo y enlaza a los términos", async ({ page }) => {
    await page.goto("/es");
    await expect(page.getByText(/es ilegal/i)).toBeVisible();
    await page.getByRole("link", { name: "Términos de uso" }).click();
    await expect(page).toHaveURL(/\/es\/terms$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Términos de uso");
    await expect(page.getByText(/Versión de los términos: \d{4}-\d{2}-\d{2}/)).toBeVisible();
  });

  test("una ruta inexistente devuelve 404", async ({ page }) => {
    const res = await page.goto("/es/no-existe");
    expect(res?.status()).toBe(404);
  });

  test("un idioma no soportado devuelve 404", async ({ page }) => {
    const res = await page.goto("/fr/modules");
    expect(res?.status()).toBe(404);
  });

  test("las páginas no exponen la cabecera X-Powered-By", async ({ request }) => {
    const res = await request.get("/es");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });
});
