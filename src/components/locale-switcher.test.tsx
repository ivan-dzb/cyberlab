// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigationModule, pathnameMock, router } from "../../tests/navigation-mock";
import { renderIntl } from "../../tests/dom";

vi.mock("@/i18n/navigation", () => navigationModule);

import { LocaleSwitcher } from "./locale-switcher";

beforeEach(() => {
  router.replace.mockReset();
  pathnameMock.value = "/challenges/bienvenida";
});

describe("LocaleSwitcher", () => {
  it("ofrece Español e English y selecciona el idioma actual", () => {
    renderIntl(<LocaleSwitcher />, "en");
    const select = screen.getByRole("combobox", { name: /language/i });
    expect(select).toHaveValue("en");
    expect(screen.getByRole("option", { name: "Español" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  });

  it("al cambiar reemplaza la ruta actual con el nuevo idioma (sin perder la página)", async () => {
    renderIntl(<LocaleSwitcher />, "es");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /idioma/i }), "en");
    expect(router.replace).toHaveBeenCalledWith("/challenges/bienvenida", { locale: "en" });
  });
});
