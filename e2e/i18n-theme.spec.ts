import { expect, test } from "./fixtures";

test.describe("idioma", () => {
  test("cambiar a inglés conserva la página y traduce la interfaz", async ({ page }) => {
    await page.goto("/es/modules");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Módulos de aprendizaje");
    await page.getByRole("combobox", { name: "Idioma" }).selectOption("en");
    await expect(page).toHaveURL(/\/en\/modules$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Learning modules");
    await expect(page.getByRole("link", { name: "Challenges" })).toBeVisible();
  });

  test("el contenido de las lecciones cambia de idioma", async ({ page }) => {
    await page.goto("/es/modules/m08-conceptos-seguridad/01-triada-cia");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("La tríada CIA y sus extensiones");
    await page.getByRole("combobox", { name: "Idioma" }).selectOption("en");
    await expect(page).toHaveURL(/\/en\/modules\/m08-conceptos-seguridad\/01-triada-cia$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The CIA triad and its extensions");
  });

  test("los retos se traducen (catálogo y detalle)", async ({ page }) => {
    await page.goto("/en/challenges");
    await expect(page.getByRole("heading", { name: "Welcome: find the flag" })).toBeVisible();
    await page.goto("/es/challenges");
    await expect(page.getByRole("heading", { name: "Bienvenida: encuentra la bandera" })).toBeVisible();
  });

  test("volver a español desde inglés", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("combobox", { name: "Language" }).selectOption("es");
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.getByRole("link", { name: "Ver módulos" })).toBeVisible();
  });

  test("los términos de uso existen en ambos idiomas", async ({ page }) => {
    await page.goto("/en/terms");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of use");
    await page.goto("/es/terms");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Términos de uso");
  });
});

test.describe("tema claro/oscuro", () => {
  test("seguir el sistema: respeta prefers-color-scheme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/es");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
    const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.emulateMedia({ colorScheme: "light" });
    const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(dark).not.toBe(light);
    expect(dark).toBe("rgb(10, 11, 15)");
    expect(light).toBe("rgb(242, 238, 228)");
  });

  test("elegir Oscuro fija data-theme y sobrevive a la recarga (renderizado en servidor, sin parpadeo)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/es");
    await page.getByRole("combobox", { name: "Tema" }).selectOption("dark");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(10, 11, 15)");
    // la respuesta HTML ya trae el tema (no depende de JS)
    const html = await (await page.request.get("/es")).text();
    expect(html).toMatch(/<html[^>]*data-theme="dark"/);
  });

  test("elegir Claro fuerza el tema claro aunque el sistema sea oscuro", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/es");
    await page.getByRole("combobox", { name: "Tema" }).selectOption("light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(242, 238, 228)");
  });

  test("volver a Sistema quita el atributo y la preferencia persiste", async ({ page }) => {
    await page.goto("/es");
    await page.getByRole("combobox", { name: "Tema" }).selectOption("dark");
    await page.getByRole("combobox", { name: "Tema" }).selectOption("system");
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Tema" })).toHaveValue("system");
  });

  test("el tema elegido se mantiene al cambiar de página e idioma", async ({ page }) => {
    await page.goto("/es");
    await page.getByRole("combobox", { name: "Tema" }).selectOption("dark");
    await page.getByRole("link", { name: "Retos" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("combobox", { name: "Idioma" }).selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
