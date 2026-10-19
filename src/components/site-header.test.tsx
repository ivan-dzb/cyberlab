// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeT } from "../../tests/dom";
import { navigationModule } from "../../tests/navigation-mock";

const m = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getXp: vi.fn() }));

vi.mock("@/i18n/navigation", () => navigationModule);
vi.mock("next-intl/server", () => ({ getTranslations: async (ns: string) => makeT(ns, "es") }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: m.getCurrentUser }));
vi.mock("@/lib/stats", () => ({ getXp: m.getXp }));
vi.mock("./locale-switcher", () => ({ LocaleSwitcher: () => <div data-testid="locale" /> }));
vi.mock("./theme-toggle", () => ({ ThemeToggle: ({ initial }: { initial: string }) => <div data-testid="theme" data-initial={initial} /> }));
vi.mock("./logout-button", () => ({ LogoutButton: () => <button>logout</button> }));

import { SiteHeader } from "./site-header";

beforeEach(() => {
  m.getCurrentUser.mockReset();
  m.getXp.mockReset();
});

describe("SiteHeader", () => {
  it("siempre muestra el logotipo y los enlaces a módulos y retos", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    render(await SiteHeader({ theme: "system" }));
    expect(screen.getByRole("link", { name: "CyberLab" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Módulos" })).toHaveAttribute("href", "/modules");
    expect(screen.getByRole("link", { name: "Retos" })).toHaveAttribute("href", "/challenges");
  });

  it("anónimo: muestra 'Iniciar sesión' y no pide XP", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    render(await SiteHeader({ theme: "system" }));
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/login");
    expect(screen.queryByText("logout")).toBeNull();
    expect(m.getXp).not.toHaveBeenCalled();
  });

  it("con sesión: muestra nivel y XP enlazando al perfil, y el botón de salir", async () => {
    m.getCurrentUser.mockResolvedValue({ id: "u1", email: "ana@example.com" });
    m.getXp.mockResolvedValue(160); // nivel 3
    render(await SiteHeader({ theme: "dark" }));
    const link = screen.getByRole("link", { name: "Nv. 3 · 160 XP" });
    expect(link).toHaveAttribute("href", "/profile");
    expect(link).toHaveAttribute("title", "ana@example.com");
    expect(screen.getByText("logout")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
    expect(m.getXp).toHaveBeenCalledWith("u1");
  });

  it("pasa el tema inicial al selector y monta el selector de idioma", async () => {
    m.getCurrentUser.mockResolvedValue(null);
    render(await SiteHeader({ theme: "dark" }));
    expect(screen.getByTestId("theme")).toHaveAttribute("data-initial", "dark");
    expect(screen.getByTestId("locale")).toBeInTheDocument();
  });
});
