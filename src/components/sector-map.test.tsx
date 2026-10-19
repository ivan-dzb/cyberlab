// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeT } from "../../tests/dom";
import { navigationModule } from "../../tests/navigation-mock";

vi.mock("@/i18n/navigation", () => navigationModule);
vi.mock("next-intl/server", () => ({ getTranslations: async (ns: string) => makeT(ns, "es") }));

import { SectorMap } from "./sector-map";

async function renderMap(published: Record<string, string>) {
  return render(await SectorMap({ published }));
}

describe("SectorMap", () => {
  it("dibuja un nodo por módulo (52) y una columna por etapa (9)", async () => {
    const { container } = await renderMap({});
    expect(container.querySelectorAll("circle.node")).toHaveLength(52);
    expect(container.querySelectorAll("text.stage-n")).toHaveLength(9);
    expect([...container.querySelectorAll("text.stage-t")].map((t) => t.textContent)).toEqual([
      "Fundamentos", "Seguridad", "Web", "Infra", "Defensa", "AppSec", "Cloud", "Reversing", "Gobierno",
    ]);
  });

  it("numera las etapas con dos dígitos", async () => {
    const { container } = await renderMap({});
    expect([...container.querySelectorAll("text.stage-n")].map((t) => t.textContent)).toEqual(["00", "01", "02", "03", "04", "05", "06", "07", "08"]);
  });

  it("etiqueta cada nodo con su id M01..M52", async () => {
    const { container } = await renderMap({});
    const ids = [...container.querySelectorAll("text.id")].map((t) => t.textContent);
    expect(ids).toHaveLength(52);
    expect(ids[0]).toBe("M01");
    expect(ids[7]).toBe("M08");
    expect(ids[51]).toBe("M52");
  });

  it("sin módulos publicados no hay nodos encendidos ni enlaces", async () => {
    const { container } = await renderMap({});
    expect(container.querySelectorAll("g.on")).toHaveLength(0);
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("los módulos publicados se encienden y enlazan a su página", async () => {
    const { container } = await renderMap({ M08: "m08-conceptos-seguridad" });
    const on = container.querySelectorAll("g.on");
    expect(on).toHaveLength(1);
    expect(on[0].querySelector("text.id")?.textContent).toBe("M08");
    expect(on[0].querySelector("title")?.textContent).toBe("M08 — disponible");
    expect(container.querySelector("a")).toHaveAttribute("href", "/modules/m08-conceptos-seguridad");
  });

  it("los no publicados indican 'en preparación'", async () => {
    const { container } = await renderMap({});
    expect(container.querySelector("title")?.textContent).toBe("M01 — en preparación");
  });

  it("es accesible: role=img con etiqueta", async () => {
    const { container } = await renderMap({});
    expect(container.querySelector("svg")).toHaveAttribute("role", "img");
    expect(container.querySelector("svg")).toHaveAttribute("aria-label", "Mapa de las nueve etapas y sus módulos");
  });
});
