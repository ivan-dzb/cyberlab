import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ query }));

import { GET } from "./route";

beforeEach(() => {
  query.mockReset();
});

describe("GET /api/health", () => {
  it("200 cuando la base de datos responde", async () => {
    query.mockResolvedValue([{ "?column?": 1 }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", db: "up" });
  });
  it("503 sin filtrar el error interno si la BD cae", async () => {
    query.mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET();
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("10.0.0.5");
  });
});
