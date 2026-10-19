// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigationModule, router } from "../../tests/navigation-mock";
import { renderIntl } from "../../tests/dom";

vi.mock("@/i18n/navigation", () => navigationModule);

import { AuthForm } from "./auth-form";

const fetchMock = vi.fn();
const reply = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  router.push.mockReset();
  router.refresh.mockReset();
});

describe("AuthForm (login)", () => {
  it("muestra correo y contraseña, sin casilla de términos", () => {
    renderIntl(<AuthForm mode="login" />);
    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute("autocomplete", "current-password");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("envía las credenciales por JSON a /api/auth/login y navega a /modules", async () => {
    fetchMock.mockResolvedValue(reply(200, { ok: true }));
    renderIntl(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/correo/i), "ana@example.com");
    await userEvent.type(screen.getByLabelText(/contraseña/i), "correct-horse-battery");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/modules"));
    expect(router.refresh).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ email: "ana@example.com", password: "correct-horse-battery" });
  });

  it("credenciales incorrectas: muestra el mensaje traducido y no navega", async () => {
    fetchMock.mockResolvedValue(reply(401, { error: "invalidCredentials" }));
    renderIntl(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/correo/i), "ana@example.com");
    await userEvent.type(screen.getByLabelText(/contraseña/i), "mal");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos.");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("429: mensaje de demasiados intentos", async () => {
    fetchMock.mockResolvedValue(reply(429, { error: "rateLimited" }));
    renderIntl(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/correo/i), "a@b.co");
    await userEvent.type(screen.getByLabelText(/contraseña/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/demasiados intentos/i);
  });

  it("error de red: mensaje de error del servidor", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    renderIntl(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/correo/i), "a@b.co");
    await userEvent.type(screen.getByLabelText(/contraseña/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/error del servidor/i);
  });

  it("deshabilita el botón mientras envía (evita doble envío)", async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    renderIntl(<AuthForm mode="login" />);
    await userEvent.type(screen.getByLabelText(/correo/i), "a@b.co");
    await userEvent.type(screen.getByLabelText(/contraseña/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));
    expect(screen.getByRole("button", { name: /entrar/i })).toBeDisabled();
    resolve(reply(401, { error: "invalidCredentials" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /entrar/i })).toBeEnabled());
  });

  it("en inglés usa los textos en inglés", () => {
    renderIntl(<AuthForm mode="login" />, "en");
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});

describe("AuthForm (register)", () => {
  it("muestra la pista de 10 caracteres y la casilla de términos obligatoria con enlace", () => {
    renderIntl(<AuthForm mode="register" />);
    expect(screen.getByText(/mínimo 10 caracteres/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute("minlength", "10");
    expect(screen.getByLabelText(/contraseña/i)).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByRole("checkbox")).toBeRequired();
    const link = screen.getByRole("link", { name: /términos de uso/i });
    expect(link).toHaveAttribute("href", "/terms");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("envía acceptTerms=true cuando se marca la casilla", async () => {
    fetchMock.mockResolvedValue(reply(201, { ok: true }));
    renderIntl(<AuthForm mode="register" />);
    await userEvent.type(screen.getByLabelText(/correo/i), "nueva@example.com");
    await userEvent.type(screen.getByLabelText(/contraseña/i), "correct-horse-battery");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/modules"));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/register");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: "nueva@example.com",
      password: "correct-horse-battery",
      acceptTerms: true,
    });
  });

  it("registerFailed: mensaje genérico que no revela si el correo existe", async () => {
    fetchMock.mockResolvedValue(reply(400, { error: "registerFailed" }));
    renderIntl(<AuthForm mode="register" />);
    await userEvent.type(screen.getByLabelText(/correo/i), "a@b.co");
    await userEvent.type(screen.getByLabelText(/contraseña/i), "correct-horse-battery");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(screen.getByRole("button", { name: /crear cuenta/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo crear la cuenta/i);
  });
});
