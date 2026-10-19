import { vi } from "vitest";

/** Construye una Request JSON válida para los endpoints (mismo origen por defecto). */
export function jsonRequest(
  url: string,
  body: unknown,
  init: { method?: string; headers?: Record<string, string> } = {},
): Request {
  return new Request(url, {
    method: init.method ?? "POST",
    headers: { "content-type": "application/json", host: "localhost:3000", ...init.headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

/** Cookie jar mínimo para mockear `next/headers`. */
export function makeCookieJar(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    api: {
      get: (name: string) => (store.has(name) ? { name, value: store.get(name)! } : undefined),
      set: vi.fn((name: string, value: string, _opts?: { expires?: Date; secure?: boolean; httpOnly?: boolean; sameSite?: string; path?: string }) => {
        void _opts;
        store.set(name, value);
      }),
      delete: vi.fn((name: string) => void store.delete(name)),
    },
  };
}
