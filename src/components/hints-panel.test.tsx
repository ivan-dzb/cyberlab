// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderIntl } from "../../tests/dom";
import { HintsPanel } from "./hints-panel";

const fetchMock = vi.fn();
const reply = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });
const state = (unlocked: number, over: Record<string, unknown> = {}) => ({
  total: 3,
  unlocked,
  hints: ["Primera pista", "Segunda pista", "Tercera pista"].slice(0, unlocked),
  completed: false,
  ...over,
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("HintsPanel", () => {
  it("no se muestra si el usuario no tiene sesión (API 401)", async () => {
    fetchMock.mockResolvedValue(reply(401));
    const { container } = renderIntl(<HintsPanel slug="x" baseXp={50} />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.querySelector(".hints-panel")).toBeNull();
  });

  it("no se muestra si el reto no tiene pistas", async () => {
    fetchMock.mockResolvedValue(reply(200, state(0, { total: 0 })));
    const { container } = renderIntl(<HintsPanel slug="x" baseXp={50} />);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.querySelector(".hints-panel")).toBeNull();
  });

  it("pide las pistas en el idioma activo", async () => {
    fetchMock.mockResolvedValue(reply(200, state(0)));
    renderIntl(<HintsPanel slug="bienvenida" baseXp={50} />, "en");
    await screen.findByText(/hints · 0\/3/i);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/challenges/bienvenida/hints?locale=en");
  });

  it("sin pistas desbloqueadas solo ofrece revelar, indicando el XP resultante (80 %)", async () => {
    fetchMock.mockResolvedValue(reply(200, state(0)));
    renderIntl(<HintsPanel slug="x" baseXp={50} />);
    expect(await screen.findByRole("button", { name: /el reto valdrá 40 xp/i })).toBeInTheDocument();
    expect(screen.queryByText("Primera pista")).toBeNull();
  });

  it("muestra solo las pistas desbloqueadas y calcula el XP de la siguiente", async () => {
    fetchMock.mockResolvedValue(reply(200, state(2)));
    renderIntl(<HintsPanel slug="x" baseXp={50} />);
    expect(await screen.findByText("Primera pista")).toBeInTheDocument();
    expect(screen.getByText("Segunda pista")).toBeInTheDocument();
    expect(screen.queryByText("Tercera pista")).toBeNull();
    expect(screen.getByRole("button", { name: /el reto valdrá 20 xp/i })).toBeInTheDocument();
  });

  it("revelar pide confirmación con el XP y llama a unlock con el idioma", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, state(0))).mockResolvedValueOnce(reply(200, state(1)));
    renderIntl(<HintsPanel slug="bienvenida" baseXp={50} />);
    await userEvent.click(await screen.findByRole("button", { name: /revelar siguiente pista/i }));
    expect(globalThis.confirm).toHaveBeenCalledWith(expect.stringContaining("40"));
    const unlock = fetchMock.mock.calls[1];
    expect(unlock[0]).toBe("/api/challenges/bienvenida/hints/unlock");
    expect(unlock[1].method).toBe("POST");
    expect(JSON.parse(unlock[1].body)).toEqual({ locale: "es" });
    expect(await screen.findByText("Primera pista")).toBeInTheDocument();
  });

  it("si el usuario cancela la confirmación no se desbloquea nada", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    fetchMock.mockResolvedValue(reply(200, state(0)));
    renderIntl(<HintsPanel slug="x" baseXp={50} />);
    await userEvent.click(await screen.findByRole("button", { name: /revelar siguiente pista/i }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("al desbloquear todas desaparece el botón", async () => {
    fetchMock.mockResolvedValue(reply(200, state(3)));
    renderIntl(<HintsPanel slug="x" baseXp={50} />);
    await screen.findByText("Tercera pista");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("si el reto está completado no ofrece más pistas", async () => {
    fetchMock.mockResolvedValue(reply(200, state(1, { completed: true })));
    renderIntl(<HintsPanel slug="x" baseXp={50} />);
    await screen.findByText("Primera pista");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("muestra un error si el servidor rechaza el desbloqueo", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, state(0))).mockResolvedValueOnce(reply(500));
    renderIntl(<HintsPanel slug="x" baseXp={50} />);
    await userEvent.click(await screen.findByRole("button", { name: /revelar siguiente pista/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo revelar la pista/i);
  });

  it("renderiza Markdown dentro de las pistas", async () => {
    fetchMock.mockResolvedValue(reply(200, { ...state(1), hints: ["Usa `Ctrl+U` para ver el código"] }));
    const { container } = renderIntl(<HintsPanel slug="x" baseXp={50} />);
    await screen.findByText("Ctrl+U");
    expect(container.querySelector("code")?.textContent).toBe("Ctrl+U");
  });
});
