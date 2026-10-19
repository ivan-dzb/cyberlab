// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Clearance } from "./clearance";

describe("Clearance", () => {
  it.each([
    ["principiante", 1],
    ["intermedio", 2],
    ["avanzado", 3],
    ["experto", 4],
  ] as const)("%s enciende %i segmento(s) de 4", (nivel, on) => {
    const { container } = render(<Clearance nivel={nivel} label="Etiqueta" />);
    expect(container.querySelectorAll(".pips i")).toHaveLength(4);
    expect(container.querySelectorAll(".pips i.on")).toHaveLength(on);
  });

  it("expone el nivel en data-nivel (el CSS le asigna color) y muestra la etiqueta", () => {
    const { container, getByText } = render(<Clearance nivel="avanzado" label="Avanzado" />);
    expect(container.querySelector(".clearance")).toHaveAttribute("data-nivel", "avanzado");
    expect(getByText("Avanzado")).toBeInTheDocument();
  });

  it("los segmentos son decorativos (aria-hidden)", () => {
    const { container } = render(<Clearance nivel="experto" label="x" />);
    expect(container.querySelector(".pips")).toHaveAttribute("aria-hidden", "true");
  });
});
