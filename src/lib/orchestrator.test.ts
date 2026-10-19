import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createContainerSession,
  destroyContainerSession,
  getActivity,
  listContainerSessions,
  sessionUrl,
} from "./orchestrator";

const fetchMock = vi.fn();
const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("createContainerSession", () => {
  const input = { sid: "s", image: "cyberlab/x:latest", port: 8080, limits: { pids: 32 }, env: { FLAG: "CYBERLAB{x}" } };

  it("hace POST /sessions con el token Bearer y el cuerpo JSON", async () => {
    fetchMock.mockResolvedValue(ok({ containerId: "abc" }, 201));
    expect(await createContainerSession(input)).toEqual({ containerId: "abc" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://orchestrator.test:4000/sessions");
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe(`Bearer ${"t".repeat(64)}`);
    expect(JSON.parse(init.body)).toEqual(input);
  });

  it("lanza con el estado HTTP si el orquestador rechaza", async () => {
    fetchMock.mockResolvedValue(new Response("imagen no permitida", { status: 400 }));
    await expect(createContainerSession(input)).rejects.toThrow(/400.*imagen no permitida/);
  });

  it("lanza si falta ORCH_TOKEN (nunca envía peticiones sin credencial)", async () => {
    const saved = process.env.ORCH_TOKEN;
    delete process.env.ORCH_TOKEN;
    await expect(createContainerSession(input)).rejects.toThrow(/ORCH_TOKEN/);
    expect(fetchMock).not.toHaveBeenCalled();
    process.env.ORCH_TOKEN = saved;
  });
});

describe("destroyContainerSession", () => {
  it("hace DELETE /sessions/:sid", async () => {
    fetchMock.mockResolvedValue(ok({ ok: true }));
    await destroyContainerSession("abc");
    expect(fetchMock.mock.calls[0][0]).toBe("http://orchestrator.test:4000/sessions/abc");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });
  it("lanza si falla", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 500 }));
    await expect(destroyContainerSession("abc")).rejects.toThrow(/500/);
  });
});

describe("getActivity / listContainerSessions", () => {
  it("devuelve la actividad", async () => {
    fetchMock.mockResolvedValue(ok({ activity: [{ sid: "a", lastSeen: 1, hits: 2 }] }));
    expect(await getActivity()).toEqual([{ sid: "a", lastSeen: 1, hits: 2 }]);
    expect(fetchMock.mock.calls[0][0]).toContain("/activity");
  });
  it("lanza si /activity falla", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 502 }));
    await expect(getActivity()).rejects.toThrow(/502/);
  });
  it("devuelve las sesiones del orquestador", async () => {
    fetchMock.mockResolvedValue(ok({ sessions: [{ sid: "a", state: "running", created: 1 }] }));
    expect(await listContainerSessions()).toHaveLength(1);
  });
  it("lanza si /sessions falla", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 401 }));
    await expect(listContainerSessions()).rejects.toThrow(/401/);
  });
});

describe("sessionUrl", () => {
  it("sustituye {sid} en la plantilla (origen propio por sesión)", () => {
    expect(sessionUrl("abc-123")).toBe("http://abc-123.lab.localhost:8081");
  });
  it("respeta una plantilla personalizada", () => {
    process.env.LAB_BASE_URL = "https://{sid}.labs.example.org";
    expect(sessionUrl("x")).toBe("https://x.labs.example.org");
    process.env.LAB_BASE_URL = "http://{sid}.lab.localhost:8081";
  });
});
