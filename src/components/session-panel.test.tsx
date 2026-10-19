// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigationModule } from "../../tests/navigation-mock";
import { renderIntl } from "../../tests/dom";

vi.mock("@/i18n/navigation", () => navigationModule);

import { SessionPanel } from "./session-panel";

type Routes = Record<string, (init?: RequestInit) => Response | Promise<Response>>;
const fetchMock = vi.fn();
const reply = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });

/** Enruta fetch por "MÉTODO /ruta". */
function routes(r: Routes) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? "GET"} ${url}`;
    const handler = r[key];
    if (!handler) throw new Error(`fetch sin mock: ${key}`);
    return handler(init);
  });
}

const SID = "3deec807-d5fd-477a-84e0-f4dfff5c6ada";
const inFuture = (ms: number) => new Date(Date.now() + ms).toISOString();
const activeSession = (over: Record<string, unknown> = {}) => ({
  session: { id: SID, slug: "bienvenida", url: `http://${SID}.lab.localhost:8081`, expiresAt: inFuture(95_000), ...over },
});
const status = (over: Record<string, unknown> = {}) => ({ completed: false, xp: 0, hintsUsed: 0, ...over });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("SessionPanel: sin sesión de usuario", () => {
  it("invita a iniciar sesión si la API responde 401", async () => {
    routes({ "GET /api/sessions": () => reply(401) });
    renderIntl(<SessionPanel slug="bienvenida" />);
    expect(await screen.findByRole("link", { name: /inicia sesión para iniciar este reto/i })).toHaveAttribute("href", "/login");
  });
});

describe("SessionPanel: sin sesión de reto activa", () => {
  const base: Routes = {
    "GET /api/sessions": () => reply(200, { session: null }),
    "GET /api/challenges/bienvenida/status": () => reply(200, status()),
  };

  it("explica el aislamiento y ofrece iniciar el reto", async () => {
    routes(base);
    renderIntl(<SessionPanel slug="bienvenida" />);
    expect(await screen.findByText(/entorno propio y aislado/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar reto" })).toBeEnabled();
  });

  it("iniciar hace POST /api/sessions con el slug y luego muestra la sesión", async () => {
    let started = false;
    routes({
      "GET /api/sessions": () => reply(200, started ? activeSession() : { session: null }),
      "GET /api/challenges/bienvenida/status": () => reply(200, status()),
      "POST /api/sessions": () => {
        started = true;
        return reply(201, { id: SID, url: "x" });
      },
    });
    renderIntl(<SessionPanel slug="bienvenida" />);
    await userEvent.click(await screen.findByRole("button", { name: "Iniciar reto" }));
    expect(await screen.findByRole("link", { name: /abrir reto/i })).toBeInTheDocument();
    const post = fetchMock.mock.calls.find((c) => c[1]?.method === "POST")!;
    expect(JSON.parse(post[1].body)).toEqual({ slug: "bienvenida" });
  });

  it("muestra el error traducido si el servidor rechaza (límite de creación)", async () => {
    routes({ ...base, "POST /api/sessions": () => reply(429, { error: "rateLimited" }) });
    renderIntl(<SessionPanel slug="bienvenida" />);
    await userEvent.click(await screen.findByRole("button", { name: "Iniciar reto" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/demasiados intentos/i);
  });

  it("409 activeSession: mensaje de sesión ya activa", async () => {
    routes({ ...base, "POST /api/sessions": () => reply(409, { error: "activeSession" }) });
    renderIntl(<SessionPanel slug="bienvenida" />);
    await userEvent.click(await screen.findByRole("button", { name: "Iniciar reto" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/ya tienes una sesión activa/i);
  });
});

describe("SessionPanel: con sesión activa de este reto", () => {
  const base: Routes = {
    "GET /api/sessions": () => reply(200, activeSession()),
    "GET /api/challenges/bienvenida/status": () => reply(200, status()),
  };

  it("muestra cuenta regresiva mm:ss y el enlace al reto en una pestaña aislada", async () => {
    routes(base);
    renderIntl(<SessionPanel slug="bienvenida" />);
    const open = await screen.findByRole("link", { name: /abrir reto/i });
    expect(open).toHaveAttribute("href", `http://${SID}.lab.localhost:8081`);
    expect(open).toHaveAttribute("target", "_blank");
    expect(open).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByText(/tiempo restante/i).textContent).toMatch(/0[01]:\d\d/);
  });

  it("extender hace POST a /extend y terminar hace DELETE", async () => {
    routes({
      ...base,
      [`POST /api/sessions/${SID}/extend`]: () => reply(200, { expiresAt: inFuture(1_800_000) }),
      [`DELETE /api/sessions/${SID}`]: () => reply(200, { ok: true }),
    });
    renderIntl(<SessionPanel slug="bienvenida" />);
    await userEvent.click(await screen.findByRole("button", { name: /extender 30 min/i }));
    await userEvent.click(screen.getByRole("button", { name: "Terminar" }));
    const methods = fetchMock.mock.calls.map((c) => `${c[1]?.method ?? "GET"} ${c[0]}`);
    expect(methods).toContain(`POST /api/sessions/${SID}/extend`);
    expect(methods).toContain(`DELETE /api/sessions/${SID}`);
  });

  it("enviar una bandera incorrecta muestra el aviso y no marca completado", async () => {
    routes({ ...base, "POST /api/challenges/bienvenida/flag": () => reply(200, { correct: false }) });
    renderIntl(<SessionPanel slug="bienvenida" />);
    await userEvent.type(await screen.findByPlaceholderText("CYBERLAB{...}"), "CYBERLAB{{mal}");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Esa no es la bandera.");
    const call = fetchMock.mock.calls.find((c) => c[0] === "/api/challenges/bienvenida/flag")!;
    expect(JSON.parse(call[1].body)).toEqual({ flag: "CYBERLAB{mal}" });
  });

  it("bandera correcta: muestra +XP y refresca el estado a completado", async () => {
    let done = false;
    routes({
      "GET /api/sessions": () => reply(200, activeSession()),
      "GET /api/challenges/bienvenida/status": () => reply(200, status(done ? { completed: true, xp: 10 } : {})),
      "POST /api/challenges/bienvenida/flag": () => {
        done = true;
        return reply(200, { correct: true, already: false, xp: 10 });
      },
    });
    renderIntl(<SessionPanel slug="bienvenida" />);
    await userEvent.type(await screen.findByPlaceholderText("CYBERLAB{...}"), "CYBERLAB{{ok}");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText("¡Correcto! +10 XP")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/reto completado/i)).toBeInTheDocument());
    expect(screen.queryByPlaceholderText("CYBERLAB{...}")).toBeNull(); // ya no pide bandera
  });

  it("bandera ya completada: mensaje específico", async () => {
    routes({ ...base, "POST /api/challenges/bienvenida/flag": () => reply(200, { correct: true, already: true, xp: 0 }) });
    renderIntl(<SessionPanel slug="bienvenida" />);
    await userEvent.type(await screen.findByPlaceholderText("CYBERLAB{...}"), "CYBERLAB{{ok}");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText(/ya habías completado este reto/i)).toBeInTheDocument();
  });

  it("noSession al enviar: mensaje traducido", async () => {
    routes({ ...base, "POST /api/challenges/bienvenida/flag": () => reply(404, { error: "noSession" }) });
    renderIntl(<SessionPanel slug="bienvenida" />);
    await userEvent.type(await screen.findByPlaceholderText("CYBERLAB{...}"), "CYBERLAB{{x}");
    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/inicia el reto antes de enviar la bandera/i);
  });

  it("no ofrece el formulario de bandera si el reto ya está completado, pero sí la insignia con XP", async () => {
    routes({ ...base, "GET /api/challenges/bienvenida/status": () => reply(200, status({ completed: true, xp: 40 })) });
    renderIntl(<SessionPanel slug="bienvenida" />);
    expect(await screen.findByText(/reto completado · 40 xp/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("CYBERLAB{...}")).toBeNull();
  });
});

describe("SessionPanel: sesión activa de OTRO reto", () => {
  it("avisa y no ofrece iniciar ni abrir", async () => {
    routes({
      "GET /api/sessions": () => reply(200, activeSession({ slug: "login-ingenuo" })),
      "GET /api/challenges/bienvenida/status": () => reply(200, status()),
    });
    renderIntl(<SessionPanel slug="bienvenida" />);
    expect(await screen.findByText(/ya tienes un reto activo/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar reto" })).toBeNull();
    expect(screen.queryByRole("link", { name: /abrir reto/i })).toBeNull();
  });
});

describe("SessionPanel: inglés", () => {
  it("usa los textos en inglés", async () => {
    routes({
      "GET /api/sessions": () => reply(200, { session: null }),
      "GET /api/challenges/bienvenida/status": () => reply(200, status()),
    });
    renderIntl(<SessionPanel slug="bienvenida" />, "en");
    expect(await screen.findByRole("button", { name: "Start challenge" })).toBeInTheDocument();
  });
});
