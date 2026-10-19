import "server-only";

// Cliente del orquestador. La app web NUNCA habla con Docker: solo con este servicio interno.
const BASE = process.env.ORCH_URL ?? "http://orchestrator:4000";

export type CreateSessionInput = {
  sid: string;
  image: string;
  port: number;
  limits: Record<string, number>;
  env: Record<string, string>;
};

async function call(method: string, path: string, body?: unknown): Promise<Response> {
  const token = process.env.ORCH_TOKEN;
  if (!token) throw new Error("ORCH_TOKEN no está definido");
  return fetch(`${BASE}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
}

export async function createContainerSession(input: CreateSessionInput): Promise<{ containerId: string }> {
  const res = await call("POST", "/sessions", input);
  if (!res.ok) throw new Error(`orchestrator create: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function destroyContainerSession(sid: string): Promise<void> {
  const res = await call("DELETE", `/sessions/${sid}`);
  if (!res.ok) throw new Error(`orchestrator destroy: ${res.status}`);
}

export type Activity = { sid: string; lastSeen: number; hits: number };

/** Última actividad (peticiones al gateway) de cada sesión. */
export async function getActivity(): Promise<Activity[]> {
  const res = await call("GET", "/activity");
  if (!res.ok) throw new Error(`orchestrator activity: ${res.status}`);
  return (await res.json()).activity;
}

export async function listContainerSessions(): Promise<{ sid: string; state: string; created: number }[]> {
  const res = await call("GET", "/sessions");
  if (!res.ok) throw new Error(`orchestrator list: ${res.status}`);
  return (await res.json()).sessions;
}

/** URL pública de un reto: origen propio por sesión, distinto al de la plataforma. */
export function sessionUrl(sid: string): string {
  const tpl = process.env.LAB_BASE_URL ?? "http://{sid}.lab.localhost:8081";
  return tpl.replace("{sid}", sid);
}
