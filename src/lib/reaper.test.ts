import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  query: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn(),
  getActivity: vi.fn(),
  listContainerSessions: vi.fn(),
  destroyContainerSession: vi.fn(),
  logSessionEvent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  query: m.query,
  getPool: () => ({ connect: async () => ({ query: m.clientQuery, release: m.release }) }),
}));
vi.mock("@/lib/orchestrator", () => ({
  getActivity: m.getActivity,
  listContainerSessions: m.listContainerSessions,
  destroyContainerSession: m.destroyContainerSession,
}));
vi.mock("@/lib/session-events", () => ({ logSessionEvent: m.logSessionEvent }));

import { runReaper, startReaper } from "./reaper";

const NOW = new Date("2026-10-19T12:00:00Z");
const min = (n: number) => n * 60_000;

type Rows = Partial<{
  active: unknown[];
  expired: unknown[];
  stuck: unknown[];
  live: unknown[];
  orphanOwner: unknown[];
}>;

/** Enruta las consultas del reaper por el texto del SQL. */
function db(rows: Rows = {}) {
  m.query.mockImplementation(async (sql: string) => {
    if (sql.includes("JOIN challenge c") && sql.includes("estado = 'activa'")) return rows.active ?? [];
    if (sql.includes("estado = 'activa' AND expira_en < now()")) return rows.expired ?? [];
    if (sql.includes("estado = 'iniciando' AND iniciado_en")) return rows.stuck ?? [];
    if (sql.includes("estado IN ('iniciando', 'activa')")) return rows.live ?? [];
    if (sql.includes("SELECT user_id FROM container_session WHERE id")) return rows.orphanOwner ?? [];
    return [];
  });
}
const sqls = () => m.query.mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  for (const f of Object.values(m)) f.mockReset();
  m.clientQuery.mockResolvedValue({ rows: [{ ok: true }] });
  m.getActivity.mockResolvedValue([]);
  m.listContainerSessions.mockResolvedValue([]);
  m.destroyContainerSession.mockResolvedValue(undefined);
  m.logSessionEvent.mockResolvedValue(undefined);
  db();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("runReaper: bloqueo", () => {
  it("si no obtiene el advisory lock no hace nada", async () => {
    m.clientQuery.mockResolvedValue({ rows: [{ ok: false }] });
    await runReaper();
    expect(m.getActivity).not.toHaveBeenCalled();
    expect(m.query).not.toHaveBeenCalled();
    expect(m.release).toHaveBeenCalledTimes(1);
  });

  it("libera el lock y la conexión aunque el ciclo falle", async () => {
    m.query.mockRejectedValue(new Error("db caída"));
    await expect(runReaper()).rejects.toThrow("db caída");
    expect(m.clientQuery.mock.calls.map((c) => String(c[0]))).toEqual([
      "SELECT pg_try_advisory_lock($1) AS ok",
      "SELECT pg_advisory_unlock($1)",
    ]);
    expect(m.release).toHaveBeenCalledTimes(1);
  });
});

describe("runReaper: extensión por actividad", () => {
  const active = (over: Record<string, unknown> = {}) => ({
    id: "s1",
    user_id: "u1",
    iniciado_en: new Date(NOW.getTime() - min(10)),
    expira_en: new Date(NOW.getTime() + min(5)),
    idle_min: 30,
    ...over,
  });

  it("extiende expira_en a lastSeen + inactividad", async () => {
    db({ active: [active()] });
    m.getActivity.mockResolvedValue([{ sid: "s1", lastSeen: NOW.getTime(), hits: 1 }]);
    await runReaper();
    const call = m.query.mock.calls.find((c) => String(c[0]).startsWith("UPDATE container_session SET expira_en"));
    expect(call).toBeDefined();
    expect((call![1][1] as Date).getTime()).toBe(NOW.getTime() + min(30));
  });

  it("respeta el tope absoluto de 2 h desde el inicio", async () => {
    db({ active: [active({ iniciado_en: new Date(NOW.getTime() - min(110)) })] });
    m.getActivity.mockResolvedValue([{ sid: "s1", lastSeen: NOW.getTime(), hits: 1 }]);
    await runReaper();
    const call = m.query.mock.calls.find((c) => String(c[0]).startsWith("UPDATE container_session SET expira_en"));
    expect((call![1][1] as Date).getTime()).toBe(NOW.getTime() - min(110) + min(120));
  });

  it("nunca acorta una expiración que ya es posterior", async () => {
    db({ active: [active({ expira_en: new Date(NOW.getTime() + min(90)) })] });
    m.getActivity.mockResolvedValue([{ sid: "s1", lastSeen: NOW.getTime(), hits: 1 }]);
    await runReaper();
    expect(sqls().some((s) => s.startsWith("UPDATE container_session SET expira_en"))).toBe(false);
  });

  it("sin actividad registrada no extiende", async () => {
    db({ active: [active()] });
    await runReaper();
    expect(sqls().some((s) => s.startsWith("UPDATE container_session SET expira_en"))).toBe(false);
  });

  it("registra 'trafico_alto' solo cuando el salto de peticiones supera el umbral", async () => {
    db({ active: [active()] });
    m.getActivity.mockResolvedValue([{ sid: "s1", lastSeen: NOW.getTime(), hits: 100 }]);
    await runReaper(); // primera observación: solo fija la línea base
    expect(m.logSessionEvent).not.toHaveBeenCalled();
    m.getActivity.mockResolvedValue([{ sid: "s1", lastSeen: NOW.getTime(), hits: 100 + 30_001 }]);
    await runReaper();
    expect(m.logSessionEvent).toHaveBeenCalledWith("s1", "u1", "trafico_alto", { peticiones: 30_001 });
  });

  it("si el gateway no responde, el ciclo continúa", async () => {
    db({ active: [active()] });
    m.getActivity.mockRejectedValue(new Error("gateway"));
    await expect(runReaper()).resolves.toBeUndefined();
  });
});

describe("runReaper: expiración", () => {
  it("destruye, marca 'expirada' y registra el evento", async () => {
    db({ expired: [{ id: "s1", user_id: "u1" }] });
    await runReaper();
    expect(m.destroyContainerSession).toHaveBeenCalledWith("s1");
    expect(sqls().some((s) => s.includes("estado = 'expirada'"))).toBe(true);
    expect(m.logSessionEvent).toHaveBeenCalledWith("s1", "u1", "expiracion");
  });

  it("si destruir falla, no la marca expirada y registra el error", async () => {
    db({ expired: [{ id: "s1", user_id: "u1" }] });
    m.destroyContainerSession.mockRejectedValue(new Error("docker"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await runReaper();
    expect(sqls().some((s) => s.includes("estado = 'expirada'"))).toBe(false);
    expect(m.logSessionEvent).toHaveBeenCalledWith("s1", "u1", "error", expect.objectContaining({ fase: "reaper" }));
  });
});

describe("runReaper: arranques atascados", () => {
  it("cierra las 'iniciando' viejas como error y las destruye", async () => {
    db({ stuck: [{ id: "s2", user_id: "u2" }] });
    await runReaper();
    expect(m.destroyContainerSession).toHaveBeenCalledWith("s2");
    expect(sqls().some((s) => s.includes("estado = 'error'"))).toBe(true);
    expect(m.logSessionEvent).toHaveBeenCalledWith("s2", "u2", "error", { fase: "iniciando" });
  });

  it("aunque destruir falle, la marca como error", async () => {
    db({ stuck: [{ id: "s2", user_id: "u2" }] });
    m.destroyContainerSession.mockRejectedValue(new Error("x"));
    await runReaper();
    expect(sqls().some((s) => s.includes("estado = 'error'"))).toBe(true);
  });
});

describe("runReaper: huérfanos", () => {
  const nowSec = NOW.getTime() / 1000;

  it("destruye contenedores sin sesión viva en BD", async () => {
    db({ live: [{ id: "viva" }], orphanOwner: [{ user_id: "u9" }] });
    m.listContainerSessions.mockResolvedValue([
      { sid: "viva", state: "running", created: nowSec - 600 },
      { sid: "huerfana", state: "running", created: nowSec - 600 },
    ]);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await runReaper();
    expect(m.destroyContainerSession).toHaveBeenCalledTimes(1);
    expect(m.destroyContainerSession).toHaveBeenCalledWith("huerfana");
    expect(m.logSessionEvent).toHaveBeenCalledWith("huerfana", "u9", "huerfana");
  });

  it("no toca contenedores recién creados (evita la carrera con la creación)", async () => {
    db({ live: [] });
    m.listContainerSessions.mockResolvedValue([{ sid: "nueva", state: "running", created: nowSec - 10 }]);
    await runReaper();
    expect(m.destroyContainerSession).not.toHaveBeenCalled();
  });

  it("sin fila en BD destruye pero no registra evento (no hay sesión a la que asociarlo)", async () => {
    db({ live: [], orphanOwner: [] });
    m.listContainerSessions.mockResolvedValue([{ sid: "x", state: "exited", created: nowSec - 600 }]);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await runReaper();
    expect(m.destroyContainerSession).toHaveBeenCalledWith("x");
    expect(m.logSessionEvent).not.toHaveBeenCalled();
  });

  it("si Docker no responde al listar, el ciclo continúa", async () => {
    m.listContainerSessions.mockRejectedValue(new Error("orq"));
    await expect(runReaper()).resolves.toBeUndefined();
  });
});

describe("runReaper: limpieza", () => {
  it("purga sesiones de autenticación y contadores caducados", async () => {
    await runReaper();
    expect(sqls().some((s) => s.includes("DELETE FROM auth_session WHERE expires_at < now()"))).toBe(true);
    expect(sqls().some((s) => s.includes("DELETE FROM rate_limit"))).toBe(true);
  });
});

describe("startReaper", () => {
  it("primera pasada a los 10 s y luego cada REAPER_INTERVAL_SEC", async () => {
    process.env.REAPER_INTERVAL_SEC = "20";
    startReaper();
    expect(m.clientQuery).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10_000);
    const afterFirst = m.clientQuery.mock.calls.filter((c) => String(c[0]).includes("try_advisory")).length;
    expect(afterFirst).toBe(1);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(m.clientQuery.mock.calls.filter((c) => String(c[0]).includes("try_advisory")).length).toBeGreaterThanOrEqual(2);
    delete process.env.REAPER_INTERVAL_SEC;
  });

  it("un error del ciclo se registra y no detiene el bucle", async () => {
    m.query.mockRejectedValue(new Error("db"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    startReaper();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(spy).toHaveBeenCalledWith("reaper:", expect.any(Error));
  });
});
