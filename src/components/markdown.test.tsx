// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

describe("Markdown", () => {
  it("renderiza títulos con ids (rehype-slug) y énfasis", () => {
    const { container } = render(<Markdown>{"## Cómo se mitiga\n\nTexto **fuerte** y *cursiva*."}</Markdown>);
    expect(container.querySelector("h2")).toHaveAttribute("id", "cómo-se-mitiga");
    expect(container.querySelector("strong")?.textContent).toBe("fuerte");
    expect(container.querySelector("em")?.textContent).toBe("cursiva");
  });

  it("soporta tablas GFM", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |";
    const { container } = render(<Markdown>{md}</Markdown>);
    expect(container.querySelectorAll("th")).toHaveLength(2);
    expect(container.querySelectorAll("td")).toHaveLength(2);
  });

  it("renderiza bloques de código", () => {
    const { container } = render(<Markdown>{"```bash\ncurl -s http://x\n```"}</Markdown>);
    expect(container.querySelector("pre code")?.textContent).toContain("curl -s http://x");
  });

  it("NO ejecuta HTML crudo: los scripts del contenido no entran al DOM", () => {
    const { container } = render(<Markdown>{'Hola <script>window.__pwned = 1</script> <img src=x onerror="window.__pwned=1">'}</Markdown>);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
  });

  it("neutraliza enlaces javascript:", () => {
    const { container } = render(<Markdown>{"[clic](javascript:alert(1))"}</Markdown>);
    const a = container.querySelector("a");
    expect(a?.getAttribute("href") ?? "").not.toMatch(/^javascript:/i);
  });

  it("envuelve el contenido en .prose", () => {
    const { container } = render(<Markdown>{"texto"}</Markdown>);
    expect(container.firstElementChild).toHaveClass("prose");
  });
});
