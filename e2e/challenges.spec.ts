import { dockerCompose, endSession, expect, FLAG_RE, liveContainers, openLab, psql, registerViaApi, startChallenge, submitFlag, test } from "./fixtures";

test.describe("catálogo de retos", () => {
  test("lista los 7 retos de nivel principiante con XP y enlaces", async ({ page }) => {
    await page.goto("/es/challenges");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Retos");
    const cards = page.locator("ul.cards li a");
    await expect(cards).toHaveCount(7);
    await expect(page.getByRole("link", { name: /Bienvenida: encuentra la bandera/ })).toContainText("10 XP");
    await expect(page.getByRole("link", { name: /La caja de cuatro dígitos/ })).toContainText("50 XP");
    await expect(cards.first()).toContainText("Principiante");
  });

  test("el reto interno _canary no aparece en el catálogo ni se puede abrir", async ({ page }) => {
    await page.goto("/es/challenges");
    await expect(page.getByText(/canario/i)).toHaveCount(0);
    expect((await page.goto("/es/challenges/_canary"))?.status()).toBe(404);
  });

  test("el detalle muestra la teoría sin revelar la solución y no hay writeup sin completar", async ({ page }) => {
    await page.goto("/es/challenges/login-ingenuo");
    await expect(page.getByRole("heading", { name: "Qué es", exact: true })).toBeVisible();
    await expect(page.getByText("admin'--")).toHaveCount(0);
    await expect(page.getByText("Writeup oficial")).toHaveCount(0);
  });

  test("anónimo: se le invita a iniciar sesión en vez de iniciar el reto", async ({ page }) => {
    await page.goto("/es/challenges/bienvenida");
    await expect(page.getByRole("link", { name: /inicia sesión para iniciar este reto/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar reto" })).toHaveCount(0);
  });

  test("el detalle de un reto inexistente o con slug malicioso devuelve 404", async ({ page }) => {
    for (const p of ["/es/challenges/nope", "/es/challenges/..%2f..%2fetc"]) {
      expect((await page.goto(p))?.status(), p).toBe(404);
    }
  });

  test("el detalle en inglés está traducido", async ({ page }) => {
    await page.goto("/en/challenges/bienvenida");
    await expect(page.getByRole("heading", { name: "What it is", exact: true })).toBeVisible();
  });
});

test.describe("sesión de reto (ciclo completo con «bienvenida»)", () => {
  test("iniciar, abrir el reto aislado, enviar bandera incorrecta y correcta, XP, perfil y writeup", async ({ page, context }) => {
    await registerViaApi(page);
    const labUrl = await startChallenge(page, "bienvenida");

    // El reto corre en un origen distinto al de la plataforma
    expect(new URL(labUrl).host).not.toBe(new URL(page.url()).host);

    const lab = await openLab(context, labUrl);
    await expect(lab.getByRole("heading", { name: "Portal interno" })).toBeVisible();
    const flag = (await lab.content()).match(FLAG_RE)![0]; // la bandera está en un comentario HTML

    await page.bringToFront();
    await expect(page.getByText(/tiempo restante/i)).toBeVisible();

    await submitFlag(page, "CYBERLAB{incorrecta}");
    await expect(page.getByRole("status")).toHaveText("Esa no es la bandera.");

    await submitFlag(page, flag);
    await expect(page.getByText("¡Correcto! +10 XP")).toBeVisible();
    await expect(page.getByText("Reto completado · 10 XP")).toBeVisible();
    await expect(page.getByPlaceholder("CYBERLAB{...}")).toHaveCount(0);

    // el writeup oficial y el XP del encabezado aparecen sin recargar (la página se refresca sola)
    await expect(page.getByText("Writeup oficial")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Qué aprendiste" })).toBeVisible();

    // el encabezado y el perfil reflejan el XP
    await expect(page.getByRole("link", { name: "Nv. 1 · 10 XP" })).toBeVisible();
    await page.goto("/es/profile");
    await expect(page.getByText(/10 XP · 40 XP para el siguiente nivel/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Bienvenida: encuentra la bandera/ })).toBeVisible();
  });

  test("terminar la sesión destruye el entorno: la URL del reto deja de existir", async ({ page, context }) => {
    await registerViaApi(page);
    const labUrl = await startChallenge(page, "bienvenida");
    const lab = await openLab(context, labUrl);
    await expect(lab.getByRole("heading", { name: "Portal interno" })).toBeVisible();

    await page.getByRole("button", { name: "Terminar" }).click();
    await expect(page.getByRole("button", { name: "Iniciar reto" })).toBeVisible({ timeout: 20_000 });

    const gone = await lab.goto(labUrl);
    expect(gone?.status()).toBe(404);
    await expect(lab.getByText(/no encontrada o expirada/i)).toBeVisible();
  });

  test("solo una sesión activa por usuario: otro reto no se puede iniciar y la API devuelve 409", async ({ page }) => {
    await registerViaApi(page);
    await startChallenge(page, "bienvenida");

    await page.goto("/es/challenges/pin-debil");
    await expect(page.getByText(/ya tienes un reto activo/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Iniciar reto" })).toHaveCount(0);

    const res = await page.request.post("/api/sessions", { data: { slug: "pin-debil" } });
    expect(res.status()).toBe(409);
    expect(await res.json()).toEqual({ error: "activeSession" });
  });

  test("extender suma tiempo a la sesión", async ({ page }) => {
    await registerViaApi(page);
    const sid = new URL(await startChallenge(page, "bienvenida")).hostname.split(".")[0];
    const expiry = () => Number(psql(`select extract(epoch from expira_en)::bigint from container_session where id = '${sid}'`));
    psql(`update container_session set expira_en = now() + interval '5 minutes' where id = '${sid}'`);
    const before = expiry();
    await page.getByRole("button", { name: /extender 30 min/i }).click();
    await expect.poll(expiry).toBeGreaterThan(before + 20 * 60); // pasa de ~5 min a ~30 min
  });

  test("la sesión activa se recupera al recargar la página", async ({ page }) => {
    await registerViaApi(page);
    const url = await startChallenge(page, "bienvenida");
    await page.reload();
    await expect(page.getByRole("link", { name: /abrir reto/i })).toHaveAttribute("href", url);
  });

  test("cada sesión recibe una bandera distinta", async ({ page, context }) => {
    await registerViaApi(page);
    const flags: string[] = [];
    for (let i = 0; i < 2; i++) {
      const url = await startChallenge(page, "bienvenida");
      const lab = await openLab(context, url);
      flags.push((await lab.content()).match(FLAG_RE)![0]);
      await lab.close();
      await page.bringToFront();
      await endSession(page);
    }
    expect(flags[0]).not.toBe(flags[1]);
  });

  test("la bandera de una sesión anterior ya no sirve en una nueva", async ({ page, context }) => {
    await registerViaApi(page);
    const url1 = await startChallenge(page, "bienvenida");
    const lab1 = await openLab(context, url1);
    const oldFlag = (await lab1.content()).match(FLAG_RE)![0];
    await lab1.close();
    await page.bringToFront();
    await endSession(page);

    await startChallenge(page, "bienvenida");
    await submitFlag(page, oldFlag);
    await expect(page.getByRole("status")).toHaveText("Esa no es la bandera.");
  });

  test("la sesión inactiva la expira el reaper: destruye el contenedor y libera al usuario", async ({ page }) => {
    test.setTimeout(150_000);
    await registerViaApi(page);
    const sid = new URL(await startChallenge(page, "bienvenida")).hostname.split(".")[0];
    expect(liveContainers(sid)).toBe(1);

    // Sin actividad registrada en el gateway (se reinicia, olvida las rutas) y con la sesión vencida.
    dockerCompose("restart", "gateway");
    psql(`update container_session set expira_en = now() - interval '1 minute' where id = '${sid}'`);

    await expect
      .poll(() => psql(`select estado from container_session where id = '${sid}'`), { timeout: 90_000, intervals: [2000] })
      .toBe("expirada");
    expect(liveContainers(sid)).toBe(0);
    expect(psql(`select count(*) from session_event where session_id = '${sid}' and tipo = 'expiracion'`)).toBe("1");
    expect(psql(`select count(*) from session_event where session_id = '${sid}' and tipo = 'inicio'`)).toBe("1");

    // el usuario queda libre para iniciar otra sesión
    await page.goto("/es/challenges/bienvenida");
    await expect(page.getByRole("button", { name: "Iniciar reto" })).toBeVisible();
  });

  test("una sesión con actividad reciente NO se expira aunque su fecha esté vencida (el reaper la extiende)", async ({ page, context }) => {
    test.setTimeout(120_000);
    await registerViaApi(page);
    const url = await startChallenge(page, "bienvenida");
    const sid = new URL(url).hostname.split(".")[0];
    const lab = await openLab(context, url); // genera actividad en el gateway
    await lab.close();
    psql(`update container_session set expira_en = now() - interval '1 minute' where id = '${sid}'`);
    await expect
      .poll(() => psql(`select expira_en > now() from container_session where id = '${sid}'`), { timeout: 60_000, intervals: [2000] })
      .toBe("t");
    expect(psql(`select estado from container_session where id = '${sid}'`)).toBe("activa");
    expect(liveContainers(sid)).toBe(1);
  });
});

test.describe("pistas y XP", () => {
  test("revelar una pista pide confirmación, resta XP y el XP final lo refleja", async ({ page, context }) => {
    await registerViaApi(page);
    const labUrl = await startChallenge(page, "robots-secretas");

    await expect(page.getByText(/Pistas · 0\/3/)).toBeVisible();
    await expect(page.getByRole("button", { name: /el reto valdrá 40 xp/i })).toBeVisible();

    // cancelar no gasta la pista
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("button", { name: /revelar siguiente pista/i }).click();
    await expect(page.getByText(/Pistas · 0\/3/)).toBeVisible();

    // aceptar revela la primera
    page.once("dialog", (d) => {
      expect(d.message()).toContain("40");
      return d.accept();
    });
    await page.getByRole("button", { name: /revelar siguiente pista/i }).click();
    await expect(page.getByText(/Pistas · 1\/3/)).toBeVisible();
    await expect(page.getByText(/La página principal no enlaza a nada interesante/)).toBeVisible();
    await expect(page.getByText("Segunda pista")).toHaveCount(0);

    // resolver: robots.txt -> /archivos-internos/
    const lab = await openLab(context, labUrl, "/archivos-internos/");
    const flag = (await lab.content()).match(FLAG_RE)![0];
    await page.bringToFront();
    await submitFlag(page, flag);
    await expect(page.getByText("¡Correcto! +40 XP")).toBeVisible();

    // tras completar ya no se ofrecen pistas
    await page.reload();
    await expect(page.getByRole("button", { name: /revelar siguiente pista/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Nv. 1 · 40 XP" })).toBeVisible();
  });

  test("las pistas llegan en el idioma activo", async ({ page }) => {
    await registerViaApi(page);
    await page.goto("/en/challenges/robots-secretas");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /reveal next hint/i }).click();
    await expect(page.getByText(/does not link to anything interesting/i)).toBeVisible();
  });

  test("la API solo entrega el texto de las pistas desbloqueadas", async ({ page }) => {
    await registerViaApi(page);
    const before = await (await page.request.get("/api/challenges/robots-secretas/hints?locale=es")).json();
    expect(before).toMatchObject({ total: 3, unlocked: 0, hints: [], completed: false });
    await page.request.post("/api/challenges/robots-secretas/hints/unlock", { data: { locale: "es" } });
    const after = await (await page.request.get("/api/challenges/robots-secretas/hints?locale=es")).json();
    expect(after.unlocked).toBe(1);
    expect(after.hints).toHaveLength(1);
    expect(JSON.stringify(after)).not.toContain("Visita `/robots.txt`");
  });

  test("no se puede cobrar la bandera sin sesión activa del reto", async ({ page }) => {
    await registerViaApi(page);
    const res = await page.request.post("/api/challenges/bienvenida/flag", { data: { flag: "CYBERLAB{x}" } });
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: "noSession" });
  });

  test("el XP se otorga una sola vez aunque se reenvíe la bandera", async ({ page, context }) => {
    await registerViaApi(page);
    const url = await startChallenge(page, "bienvenida");
    const lab = await openLab(context, url);
    const flag = (await lab.content()).match(FLAG_RE)![0];
    const first = await (await page.request.post("/api/challenges/bienvenida/flag", { data: { flag } })).json();
    const second = await (await page.request.post("/api/challenges/bienvenida/flag", { data: { flag } })).json();
    expect(first).toEqual({ correct: true, already: false, xp: 10 });
    expect(second).toEqual({ correct: true, already: true, xp: 0 });
    expect(psql("select sum(xp_otorgado) from user_progress")).not.toBe("");
  });
});
