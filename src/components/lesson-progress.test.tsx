// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderIntl } from "../../tests/dom";
import { __resetProgressStoreForTests, LessonCheck, LessonDoneButton, ModuleProgress } from "./lesson-progress";

const fetchMock = vi.fn();
const KEY = "m08-conceptos-seguridad/01-triada-cia";
const KEY2 = "m08-conceptos-seguridad/02-riesgo";
const reply = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });

function Everything() {
  return (
    <>
      <LessonDoneButton lessonKey={KEY} />
      <LessonCheck lessonKey={KEY} />
      <ModuleProgress keys={[KEY, KEY2]} />
    </>
  );
}

beforeEach(() => {
  __resetProgressStoreForTests();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});

describe("progreso con sesión iniciada (servidor)", () => {
  it("carga mis lecciones completadas y las refleja en los tres componentes", async () => {
    fetchMock.mockResolvedValue(reply(200, { keys: [KEY] }));
    renderIntl(<Everything />);
    expect(await screen.findByRole("button", { name: "Marcar como pendiente" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("✓")).toBeInTheDocument();
    expect(screen.getByText("1/2 lecciones")).toBeInTheDocument();
  });

  it("marcar como completada envía PUT { key, done: true } y actualiza al instante", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { keys: [] })).mockResolvedValue(reply(200, { ok: true }));
    renderIntl(<Everything />);
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }));
    expect(screen.getByRole("button", { name: "Marcar como pendiente" })).toBeInTheDocument();
    expect(screen.getByText("1/2 lecciones")).toBeInTheDocument();
    const put = fetchMock.mock.calls.find((c) => c[1]?.method === "PUT")!;
    expect(put[0]).toBe("/api/progress");
    expect(JSON.parse(put[1].body)).toEqual({ key: KEY, done: true });
  });

  it("desmarcar envía done:false", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { keys: [KEY] })).mockResolvedValue(reply(200, { ok: true }));
    renderIntl(<Everything />);
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como pendiente" }));
    const put = fetchMock.mock.calls.find((c) => c[1]?.method === "PUT")!;
    expect(JSON.parse(put[1].body)).toEqual({ key: KEY, done: false });
    expect(screen.getByText("0/2 lecciones")).toBeInTheDocument();
  });

  it("si el servidor rechaza la escritura, revierte el cambio", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { keys: [] })).mockResolvedValue(reply(500));
    renderIntl(<Everything />);
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Marcar como completada" })).toBeInTheDocument());
    expect(screen.getByText("0/2 lecciones")).toBeInTheDocument();
  });

  it("si falla la red al escribir, también revierte", async () => {
    fetchMock.mockResolvedValueOnce(reply(200, { keys: [] })).mockRejectedValue(new Error("offline"));
    renderIntl(<Everything />);
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }));
    await waitFor(() => expect(screen.getByText("0/2 lecciones")).toBeInTheDocument());
  });

  it("importa una sola vez el progreso de localStorage y lo limpia", async () => {
    localStorage.setItem("cyberlab:progress", JSON.stringify({ [KEY]: true }));
    fetchMock
      .mockResolvedValueOnce(reply(200, { keys: [] })) // GET inicial (autenticado)
      .mockResolvedValueOnce(reply(200, { imported: 1 })) // POST import
      .mockResolvedValueOnce(reply(200, { keys: [KEY] })); // GET tras importar
    renderIntl(<Everything />);
    expect(await screen.findByRole("button", { name: "Marcar como pendiente" })).toBeInTheDocument();
    const post = fetchMock.mock.calls.find((c) => c[1]?.method === "POST")!;
    expect(JSON.parse(post[1].body)).toEqual({ keys: [KEY] });
    expect(localStorage.getItem("cyberlab:progress")).toBeNull();
  });

  it("el estado se inicializa una sola vez aunque haya varios componentes", async () => {
    fetchMock.mockResolvedValue(reply(200, { keys: [] }));
    renderIntl(<Everything />);
    await screen.findByRole("button", { name: "Marcar como completada" });
    expect(fetchMock.mock.calls.filter((c) => c[0] === "/api/progress")).toHaveLength(1);
  });
});

describe("progreso sin sesión (localStorage)", () => {
  it("usa localStorage cuando la API responde 401", async () => {
    localStorage.setItem("cyberlab:progress", JSON.stringify({ [KEY2]: true }));
    fetchMock.mockResolvedValue(reply(401));
    renderIntl(<Everything />);
    expect(await screen.findByText("1/2 lecciones")).toBeInTheDocument();
  });

  it("marcar guarda en localStorage y no llama a la API de escritura", async () => {
    fetchMock.mockResolvedValue(reply(401));
    renderIntl(<Everything />);
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }));
    expect(JSON.parse(localStorage.getItem("cyberlab:progress")!)).toEqual({ [KEY]: true });
    expect(fetchMock.mock.calls.some((c) => c[1]?.method === "PUT")).toBe(false);
  });

  it("sin red usa el modo local", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    renderIntl(<Everything />);
    await userEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }));
    expect(screen.getByText("1/2 lecciones")).toBeInTheDocument();
  });

  it("tolera localStorage corrupto", async () => {
    localStorage.setItem("cyberlab:progress", "{no es json");
    fetchMock.mockResolvedValue(reply(401));
    renderIntl(<Everything />);
    expect(await screen.findByText("0/2 lecciones")).toBeInTheDocument();
  });
});

describe("estado de carga inicial (regresión: clics perdidos antes de hidratar)", () => {
  it("el botón está deshabilitado mientras se carga el estado y se habilita al terminar", async () => {
    let release!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (release = resolve)));
    renderIntl(<Everything />);
    const button = screen.getByRole("button", { name: "Marcar como completada" });
    expect(button).toBeDisabled();
    await userEvent.click(button); // un clic en esta fase no debe hacer nada
    expect(fetchMock).toHaveBeenCalledTimes(1); // solo la carga inicial
    release(reply(401));
    await waitFor(() => expect(screen.getByRole("button", { name: "Marcar como completada" })).toBeEnabled());
    expect(localStorage.getItem("cyberlab:progress")).toBeNull();
  });

  it("tras cargar, el primer clic se conserva (modo local)", async () => {
    fetchMock.mockResolvedValue(reply(401));
    renderIntl(<Everything />);
    const button = await screen.findByRole("button", { name: "Marcar como completada" });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    expect(screen.getByRole("button", { name: "Marcar como pendiente" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("cyberlab:progress")!)).toEqual({ [KEY]: true });
  });
});

describe("LessonCheck", () => {
  it("muestra ○ si la lección no está completada", async () => {
    fetchMock.mockResolvedValue(reply(200, { keys: [] }));
    renderIntl(<LessonCheck lessonKey={KEY} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await screen.findByText("○")).toBeInTheDocument();
  });
});
