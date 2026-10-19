import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ query }));

import { getWriteupForUser } from "./writeup";

beforeEach(() => {
  query.mockReset();
});

describe("getWriteupForUser", () => {
  it("devuelve null si el usuario no completó el reto (la consulta exige 'completado')", async () => {
    query.mockResolvedValue([]);
    expect(await getWriteupForUser("u", "reto", "es")).toBeNull();
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain("p.estado = 'completado'");
    expect(sql).toContain("c.visible");
    expect(query.mock.calls[0][1]).toEqual(["reto", "u"]);
  });

  it("devuelve el texto en el idioma pedido", async () => {
    query.mockResolvedValue([{ writeup: { es: "solución", en: "solution" } }]);
    expect(await getWriteupForUser("u", "r", "en")).toEqual({ body: "solution", fallback: false });
  });

  it("cae a español y lo indica", async () => {
    query.mockResolvedValue([{ writeup: { es: "solución" } }]);
    expect(await getWriteupForUser("u", "r", "en")).toEqual({ body: "solución", fallback: true });
  });

  it("devuelve null si el reto no tiene writeup", async () => {
    query.mockResolvedValue([{ writeup: {} }]);
    expect(await getWriteupForUser("u", "r", "es")).toBeNull();
  });
});
