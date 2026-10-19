import AxeBuilder from "@axe-core/playwright";
import { type Page } from "@playwright/test";
import { expect, registerViaApi, test } from "./fixtures";

const PUBLIC_PAGES = [
  ["inicio", "/es"],
  ["módulos", "/es/modules"],
  ["módulo", "/es/modules/m08-conceptos-seguridad"],
  ["lección", "/es/modules/m08-conceptos-seguridad/05-vocabulario-de-vulnerabilidades"],
  ["retos", "/es/challenges"],
  ["reto", "/es/challenges/login-ingenuo"],
  ["login", "/es/login"],
  ["registro", "/es/register"],
  ["términos", "/es/terms"],
  ["inicio (en)", "/en"],
  ["lección (en)", "/en/modules/m08-conceptos-seguridad/01-triada-cia"],
] as const;

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} nodo(s) · ${v.nodes[0]?.target.join(" ")} — ${v.help}`);
}

test.describe("accesibilidad (axe, WCAG 2.1 A/AA)", () => {
  for (const scheme of ["light", "dark"] as const) {
    for (const [name, path] of PUBLIC_PAGES) {
      test(`${name} en tema ${scheme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        await page.getByRole("combobox", { name: /tema|theme/i }).selectOption(scheme);
        await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
        expect(await violations(page)).toEqual([]);
      });
    }

    test(`perfil con sesión en tema ${scheme}`, async ({ page }) => {
      await registerViaApi(page);
      await page.goto("/es/profile");
      await page.getByRole("combobox", { name: "Tema" }).selectOption(scheme);
      expect(await violations(page)).toEqual([]);
    });

    test(`reto con sesión activa (paneles de sesión y pistas) en tema ${scheme}`, async ({ page }) => {
      await registerViaApi(page);
      await page.goto("/es/challenges/bienvenida");
      await page.getByRole("combobox", { name: "Tema" }).selectOption(scheme);
      await expect(page.getByRole("button", { name: "Iniciar reto" })).toBeVisible();
      await expect(page.getByText(/Pistas · 0\/3/)).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
  }

  test("los formularios tienen etiquetas asociadas y el error se anuncia (role=alert)", async ({ page }) => {
    await page.goto("/es/login");
    await expect(page.getByLabel("Correo")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
    await page.getByLabel("Correo").fill("nadie@example.test");
    await page.getByLabel("Contraseña").fill("incorrecta-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".form-error")).toHaveAttribute("role", "alert");
  });

  test("el foco es visible al navegar con teclado", async ({ page }) => {
    await page.goto("/es");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const cs = getComputedStyle(el);
      return { tag: el.tagName, width: cs.outlineWidth, style: cs.outlineStyle };
    });
    expect(outline.style).not.toBe("none");
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
  });

  test("la barra de censura se puede revelar con teclado (foco)", async ({ page }) => {
    await page.goto("/es");
    const redact = page.locator(".redact");
    await redact.focus();
    // la transición de color dura 0,25 s: se espera a que el texto pase de transparente a visible
    await expect.poll(() => redact.evaluate((el) => getComputedStyle(el).color)).not.toBe("rgba(0, 0, 0, 0)");
    await expect.poll(() => redact.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  });
});

test.describe("responsive", () => {
  for (const [label, size] of [
    ["móvil 375", { width: 375, height: 812 }],
    ["tablet 768", { width: 768, height: 1024 }],
  ] as const) {
    test.describe(label, () => {
      test.use({ viewport: size });
      for (const [name, path] of PUBLIC_PAGES.filter((p) => !p[1].startsWith("/en"))) {
        test(`${name}: sin desbordamiento horizontal`, async ({ page }) => {
          await page.goto(path);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(overflow).toBeLessThanOrEqual(1);
        });
      }

      test("el encabezado mantiene visibles los controles esenciales", async ({ page }) => {
        await page.goto("/es");
        await expect(page.getByRole("combobox", { name: "Idioma" })).toBeVisible();
        await expect(page.getByRole("combobox", { name: "Tema" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Retos" })).toBeVisible();
      });
    });
  }

  test("en móvil el mapa de módulos se desplaza dentro de su contenedor (no ensancha la página)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/es#map");
    const m = await page.evaluate(() => {
      const scroller = document.querySelector(".map-scroll") as HTMLElement;
      return { inner: scroller.scrollWidth, outer: scroller.clientWidth, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(m.inner).toBeGreaterThan(m.outer);
    expect(m.page).toBeLessThanOrEqual(1);
  });

  test("en móvil el flujo de registro y el panel de reto son utilizables", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await registerViaApi(page);
    await page.goto("/es/challenges/bienvenida");
    const button = page.getByRole("button", { name: "Iniciar reto" });
    await expect(button).toBeVisible();
    const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(40); // objetivo táctil cómodo
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  });
});
