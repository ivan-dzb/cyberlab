import net from "node:net";
import { type Browser } from "@playwright/test";
import { expect, openLab, PASSWORD, registerViaApi, startChallenge, test, uniqueEmail } from "./fixtures";

const closedPort = (port: number) =>
  new Promise<boolean>((resolve) => {
    const s = net.connect({ host: "127.0.0.1", port, timeout: 1500 });
    s.on("connect", () => (s.destroy(), resolve(false)));
    s.on("timeout", () => (s.destroy(), resolve(true)));
    s.on("error", () => resolve(true));
  });

async function otherUser(browser: Browser) {
  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": `10.${Math.floor(Math.random() * 250) + 1}.7.7` } });
  const page = await ctx.newPage();
  const res = await page.request.post("/api/auth/register", { data: { email: uniqueEmail("otro"), password: PASSWORD, acceptTerms: true } });
  expect(res.status()).toBe(201);
  return { ctx, page };
}

test.describe("aislamiento entre el reto y la plataforma (origen distinto)", () => {
  test("el reto no puede leer la API de la plataforma ni usar la cookie de sesión (CORS)", async ({ page, context }) => {
    await registerViaApi(page);
    const lab = await openLab(context, await startChallenge(page, "bienvenida"));
    const result = await lab.evaluate(async () => {
      try {
        const r = await fetch("http://localhost:3000/api/sessions", { credentials: "include" });
        return { leaked: true, status: r.status };
      } catch (e) {
        return { leaked: false, error: String(e) };
      }
    });
    expect(result.leaked).toBe(false);
    expect(await lab.evaluate(() => document.cookie)).not.toContain("session=");
  });

  test("el reto no puede cerrar la sesión del usuario (CSRF por fetch JSON ni por formulario)", async ({ page, context }) => {
    await registerViaApi(page);
    const lab = await openLab(context, await startChallenge(page, "bienvenida"));

    // fetch con JSON: bloqueado por CORS (preflight sin permiso)
    const viaFetch = await lab.evaluate(async () => {
      try {
        await fetch("http://localhost:3000/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: "{}",
        });
        return "enviado";
      } catch {
        return "bloqueado";
      }
    });
    expect(viaFetch).toBe("bloqueado");

    // formulario clásico entre sitios: la API exige JSON y mismo origen
    await lab.evaluate(() => {
      const f = document.createElement("form");
      f.method = "POST";
      f.action = "http://localhost:3000/api/auth/logout";
      document.body.appendChild(f);
      f.submit();
    });
    await lab.waitForLoadState();
    expect(await lab.locator("body").innerText()).toContain("badRequest");

    // la sesión del usuario sigue viva
    expect((await page.request.get("/api/progress")).status()).toBe(200);
  });

  test("el reto no puede pisar la cookie de sesión de la plataforma", async ({ page, context }) => {
    await registerViaApi(page);
    const before = (await context.cookies("http://localhost:3000")).find((c) => c.name === "session")!.value;
    const lab = await openLab(context, await startChallenge(page, "bienvenida"));
    await lab.evaluate(() => {
      document.cookie = "session=robada; domain=localhost; path=/";
    });
    const after = (await context.cookies("http://localhost:3000")).find((c) => c.name === "session")!.value;
    expect(after).toBe(before);
    expect((await page.request.get("/api/progress")).status()).toBe(200);
  });

  test("las respuestas del reto llevan Referrer-Policy y nosniff, y no revelan el servidor", async ({ page, context }) => {
    await registerViaApi(page);
    const url = await startChallenge(page, "bienvenida");
    const lab = await openLab(context, url);
    const res = await lab.goto(url);
    const h = res!.headers();
    expect(h["referrer-policy"]).toBe("no-referrer");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("el identificador de sesión es un UUID v4 (no adivinable) y cada sesión tiene un origen distinto", async ({ page }) => {
    await registerViaApi(page);
    const url = await startChallenge(page, "bienvenida");
    expect(new URL(url).hostname.split(".")[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test("hosts desconocidos en el gateway devuelven 404 sin pistas", async ({ request }) => {
    for (const host of ["11111111-1111-4111-8111-111111111111.lab.localhost:8081", "admin.lab.localhost:8081", "localhost:8081"]) {
      const res = await request.get("http://127.0.0.1:8081/", { headers: { host } });
      expect(res.status(), host).toBe(404);
    }
  });
});

test.describe("aislamiento entre usuarios", () => {
  test("otro usuario no puede terminar, extender ni usar la sesión ajena", async ({ page, browser }) => {
    await registerViaApi(page);
    const url = await startChallenge(page, "bienvenida");
    const sid = new URL(url).hostname.split(".")[0];

    const { ctx, page: intruder } = await otherUser(browser);
    expect((await intruder.request.delete(`/api/sessions/${sid}`, { data: {} })).status()).toBe(404);
    expect((await intruder.request.post(`/api/sessions/${sid}/extend`, { data: {} })).status()).toBe(404);
    // tampoco puede cobrar la bandera de ese reto sin su propia sesión
    expect((await intruder.request.post("/api/challenges/bienvenida/flag", { data: { flag: "CYBERLAB{x}" } })).status()).toBe(404);
    // ni ver la sesión ajena
    expect((await (await intruder.request.get("/api/sessions")).json()).session).toBeNull();
    await ctx.close();

    // la sesión del dueño sigue intacta
    const mine = await (await page.request.get("/api/sessions")).json();
    expect(mine.session.id).toBe(sid);
  });

  test("la bandera de la sesión de otro usuario no vale en la mía", async ({ page, browser, context }) => {
    await registerViaApi(page);
    const labA = await openLab(context, await startChallenge(page, "bienvenida"));
    const flagA = (await labA.content()).match(/CYBERLAB\{[^}]+\}/)![0];

    const { ctx, page: b } = await otherUser(browser);
    await startChallenge(b, "bienvenida");
    await b.getByPlaceholder("CYBERLAB{...}").fill(flagA);
    await b.getByRole("button", { name: "Enviar" }).click();
    await expect(b.getByRole("status")).toHaveText("Esa no es la bandera.");
    // limpieza de la sesión del intruso
    await b.request.delete(`/api/sessions/${(await (await b.request.get("/api/sessions")).json()).session.id}`, { data: {} });
    await ctx.close();
  });
});

test.describe("sesiones y credenciales", () => {
  test("cerrar sesión invalida el token en el servidor (no se puede reutilizar)", async ({ page, request }) => {
    await registerViaApi(page);
    const token = (await page.context().cookies()).find((c) => c.name === "session")!.value;
    expect((await request.get("/api/progress", { headers: { cookie: `session=${token}` } })).status()).toBe(200);
    await page.request.post("/api/auth/logout", { data: {} });
    expect((await request.get("/api/progress", { headers: { cookie: `session=${token}` } })).status()).toBe(401);
  });

  test("cada inicio de sesión emite un token nuevo (sin fijación de sesión)", async ({ page }) => {
    const email = await registerViaApi(page);
    const t1 = (await page.context().cookies()).find((c) => c.name === "session")!.value;
    await page.request.post("/api/auth/logout", { data: {} });
    await page.request.post("/api/auth/login", { data: { email, password: PASSWORD } });
    const t2 = (await page.context().cookies()).find((c) => c.name === "session")!.value;
    expect(t2).not.toBe(t1);
  });

  test("una cookie de sesión inventada no da acceso", async ({ request }) => {
    for (const token of ["x", "A".repeat(43), "' OR '1'='1", "../../etc/passwd"]) {
      expect((await request.get("/api/progress", { headers: { cookie: `session=${token}` } })).status(), token).toBe(401);
    }
  });

  test("la API no sirve una contraseña ni un hash en ninguna respuesta", async ({ page }) => {
    const email = await registerViaApi(page);
    await page.goto("/es/profile");
    const html = await page.content();
    expect(html).not.toContain(PASSWORD);
    expect(html).not.toContain("scrypt$");
    expect(html).toContain(email);
  });
});

test.describe("validación de entrada", () => {
  test("correos con HTML o inyección SQL se rechazan antes de tocar la base de datos", async ({ request }) => {
    for (const email of ["<script>alert(1)</script>@example.test", "'; DROP TABLE app_user;--@example.test", "a@b.co'--", ""]) {
      const res = await request.post("/api/auth/register", { data: { email, password: PASSWORD, acceptTerms: true } });
      expect(res.status(), email).toBe(400);
    }
  });

  test("el login con inyección SQL en el correo devuelve el mismo 401 genérico", async ({ request }) => {
    const res = await request.post("/api/auth/login", { data: { email: "' OR 1=1--@example.test", password: "x" } });
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: "invalidCredentials" });
  });

  test("las APIs rechazan peticiones sin Content-Type JSON o con Origin ajeno", async ({ page }) => {
    await registerViaApi(page);
    const noJson = await page.request.post("/api/sessions", { form: { slug: "bienvenida" } });
    expect(noJson.status()).toBe(400);
    const evil = await page.request.post("/api/sessions", { data: { slug: "bienvenida" }, headers: { origin: "http://evil.com" } });
    expect(evil.status()).toBe(400);
  });

  test("los retos internos (_canary) no se pueden iniciar por la API", async ({ page }) => {
    await registerViaApi(page);
    const res = await page.request.post("/api/sessions", { data: { slug: "_canary" } });
    expect(res.status()).toBe(400);
  });

  test("slugs con path traversal en las APIs de retos dan error, no datos", async ({ page }) => {
    await registerViaApi(page);
    for (const p of ["/api/challenges/..%2f..%2fetc/status", "/api/challenges/%27%20OR%201%3D1--/hints"]) {
      const res = await page.request.get(p);
      expect([400, 404], p).toContain(res.status());
    }
  });
});

test.describe("servicios internos no expuestos", () => {
  test("el orquestador (4000), el admin del gateway (8082) y el proxy de Docker (2375) no son accesibles desde el host", async () => {
    for (const port of [4000, 8082, 2375]) expect(await closedPort(port), `puerto ${port}`).toBe(true);
  });
});
