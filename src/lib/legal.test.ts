import { describe, expect, it } from "vitest";
import { getTerms, TOS_VERSION } from "./legal";

describe("getTerms", () => {
  it("la versión del archivo coincide con TOS_VERSION (en ambos idiomas)", async () => {
    expect((await getTerms("es")).version).toBe(TOS_VERSION);
    expect((await getTerms("en")).version).toBe(TOS_VERSION);
  });
  it("devuelve el texto en el idioma pedido", async () => {
    expect((await getTerms("es")).titulo).toBe("Términos de uso");
    expect((await getTerms("en")).titulo).toBe("Terms of use");
  });
  it("un idioma desconocido cae a español", async () => {
    expect((await getTerms("fr")).titulo).toBe("Términos de uso");
  });
  it("el cuerpo no está vacío y no incluye el frontmatter", async () => {
    const t = await getTerms("en");
    expect(t.body.length).toBeGreaterThan(200);
    expect(t.body).not.toContain("titulo:");
  });
  it("la versión es una fecha ISO (YAML la parsea como Date y se normaliza)", async () => {
    expect((await getTerms("es")).version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
