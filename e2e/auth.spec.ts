import { expect, PASSWORD, registerViaApi, registerViaUi, test, uniqueEmail } from "./fixtures";

test.describe("registro", () => {
  test("crear cuenta desde la interfaz inicia sesión y muestra nivel y XP", async ({ page }) => {
    const email = await registerViaUi(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Módulos de aprendizaje");
    await expect(page.getByRole("link", { name: "Nv. 1 · 0 XP" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Iniciar sesión" })).toHaveCount(0);
    expect(email).toContain("@example.test");
  });

  test("la casilla de términos es obligatoria y el enlace abre los términos en otra pestaña", async ({ page, context }) => {
    await page.goto("/es/register");
    await page.getByLabel("Correo").fill(uniqueEmail());
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/es\/register$/); // el navegador bloquea el envío sin aceptar
    const [terms] = await Promise.all([context.waitForEvent("page"), page.locator("form").getByRole("link", { name: "términos de uso" }).click()]);
    await terms.waitForLoadState();
    await expect(terms).toHaveURL(/\/es\/terms$/);
  });

  test("una contraseña de menos de 10 caracteres no se envía", async ({ page }) => {
    await page.goto("/es/register");
    await page.getByLabel("Correo").fill(uniqueEmail());
    await page.getByLabel("Contraseña").fill("corta");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page).toHaveURL(/\/es\/register$/);
    const valid = await page.getByLabel("Contraseña").evaluate((el: HTMLInputElement) => el.validity.tooShort);
    expect(valid).toBe(true);
  });

  test("registrar un correo ya existente da un mensaje genérico (no revela la cuenta)", async ({ page, request }) => {
    const email = await registerViaApi(page);
    await page.context().clearCookies();
    await page.goto("/es/register");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.locator(".form-error")).toHaveText(/no se pudo crear la cuenta/i);
    void request;
  });

  test("el correo se normaliza: no se puede duplicar cambiando mayúsculas", async ({ page }) => {
    const email = await registerViaApi(page);
    await page.context().clearCookies();
    const res = await page.request.post("/api/auth/register", { data: { email: email.toUpperCase(), password: PASSWORD, acceptTerms: true } });
    expect(res.status()).toBe(400);
  });
});

test.describe("inicio y cierre de sesión", () => {
  test("login correcto, logout y la sesión deja de valer", async ({ page }) => {
    const email = await registerViaApi(page);
    await page.request.post("/api/auth/logout", { data: {} });
    await page.context().clearCookies();

    await page.goto("/es/login");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL("**/es/modules");
    await expect(page.getByRole("link", { name: /Nv\. 1/ })).toBeVisible();

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
    // la API ya no reconoce la sesión
    expect((await page.request.get("/api/progress")).status()).toBe(401);
  });

  test("credenciales incorrectas muestran un mensaje genérico", async ({ page }) => {
    const email = await registerViaApi(page);
    await page.context().clearCookies();
    await page.goto("/es/login");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill("contraseña-equivocada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".form-error")).toHaveText("Correo o contraseña incorrectos.");
    await expect(page).toHaveURL(/\/es\/login$/);
  });

  test("correo inexistente: exactamente el mismo mensaje que con contraseña errónea", async ({ page }) => {
    await page.goto("/es/login");
    await page.getByLabel("Correo").fill(uniqueEmail("nadie"));
    await page.getByLabel("Contraseña").fill("lo-que-sea-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".form-error")).toHaveText("Correo o contraseña incorrectos.");
  });

  test("tras 5 intentos fallidos la cuenta se limita (429 y mensaje)", async ({ page }) => {
    const email = await registerViaApi(page);
    await page.context().clearCookies();
    let last = 0;
    for (let i = 0; i < 6; i++) {
      const res = await page.request.post("/api/auth/login", { data: { email, password: `mala-${i}-contraseña` } });
      last = res.status();
    }
    expect(last).toBe(429);
    // incluso la contraseña correcta queda bloqueada durante la ventana
    const ok = await page.request.post("/api/auth/login", { data: { email, password: PASSWORD } });
    expect(ok.status()).toBe(429);
    expect(ok.headers()["retry-after"]).toMatch(/^\d+$/);

    await page.goto("/es/login");
    await page.getByLabel("Correo").fill(email);
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator(".form-error")).toHaveText(/demasiados intentos/i);
  });

  test("el login está en inglés cuando el idioma es en", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Log in");
    await page.getByLabel("Email").fill(uniqueEmail("nadie"));
    await page.getByLabel("Password").fill("whatever-123");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.locator(".form-error")).toHaveText("Incorrect email or password.");
  });
});

test.describe("rutas protegidas", () => {
  test("el perfil redirige a /login si no hay sesión", async ({ page }) => {
    await page.goto("/es/profile");
    await expect(page).toHaveURL(/\/es\/login$/);
  });

  test("las APIs autenticadas responden 401 sin sesión", async ({ request }) => {
    for (const path of ["/api/progress", "/api/sessions", "/api/challenges/bienvenida/status", "/api/challenges/bienvenida/hints"]) {
      expect((await request.get(path)).status(), path).toBe(401);
    }
  });

  test("el perfil muestra el correo del usuario con sesión", async ({ page }) => {
    const email = await registerViaApi(page);
    await page.goto("/es/profile");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(email);
    await expect(page.getByText("Aún no has completado ningún reto.")).toBeVisible();
  });

  test("la cookie de sesión es httpOnly y SameSite=Lax", async ({ page }) => {
    await registerViaApi(page);
    await page.goto("/es");
    const cookie = (await page.context().cookies()).find((c) => c.name === "session")!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("Lax");
    expect(await page.evaluate(() => document.cookie)).not.toContain("session=");
  });
});
