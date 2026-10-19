// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { renderIntl } from "../../tests/dom";
import { ThemeToggle } from "./theme-toggle";

beforeEach(() => {
  document.documentElement.removeAttribute("data-theme");
  document.cookie = "theme=; max-age=0; path=/";
});

describe("ThemeToggle", () => {
  it("ofrece Sistema, Claro y Oscuro con el valor inicial seleccionado", () => {
    renderIntl(<ThemeToggle initial="dark" />);
    expect(screen.getByRole("combobox", { name: /tema/i })).toHaveValue("dark");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Sistema", "Claro", "Oscuro"]);
  });

  it("al elegir Oscuro fija data-theme y guarda la cookie", async () => {
    renderIntl(<ThemeToggle initial="system" />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.cookie).toContain("theme=dark");
  });

  it("al elegir Claro fija data-theme=light", async () => {
    renderIntl(<ThemeToggle initial="dark" />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.cookie).toContain("theme=light");
  });

  it("al volver a Sistema quita data-theme (sigue la preferencia del SO)", async () => {
    renderIntl(<ThemeToggle initial="dark" />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    await userEvent.selectOptions(screen.getByRole("combobox"), "system");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(document.cookie).toContain("theme=system");
  });

  it("textos en inglés", () => {
    renderIntl(<ThemeToggle initial="system" />, "en");
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["System", "Light", "Dark"]);
  });
});
