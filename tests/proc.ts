// Utilidades para probar los servicios Node (orquestador, gateway) como procesos reales.
import { type ChildProcess, spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";

export const root = path.resolve(__dirname, "..");

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

export type Proc = { child: ChildProcess; output: () => string; stop: () => Promise<void>; exited: Promise<number | null> };

export async function startProc(script: string, env: Record<string, string>, readyMarker?: string): Promise<Proc> {
  const child: ChildProcess = spawn(process.execPath, [path.join(root, script)], { env: { PATH: process.env.PATH ?? "", ...env } as unknown as NodeJS.ProcessEnv, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout!.on("data", (d) => (out += d));
  child.stderr!.on("data", (d) => (out += d));
  const exited = new Promise<number | null>((resolve) => child.on("exit", (code) => resolve(code)));
  const proc: Proc = {
    child,
    output: () => out,
    exited,
    stop: async () => {
      if (child.exitCode === null) child.kill();
      await exited;
    },
  };
  if (readyMarker) {
    const start = Date.now();
    while (!out.includes(readyMarker)) {
      if (child.exitCode !== null) throw new Error(`el proceso terminó antes de estar listo:\n${out}`);
      if (Date.now() - start > 10_000) throw new Error(`timeout esperando "${readyMarker}":\n${out}`);
      await new Promise((r) => setTimeout(r, 25));
    }
    await new Promise((r) => setTimeout(r, 50)); // da tiempo a que se abran los demás listeners
  }
  return proc;
}

export type Recorded = { method: string; url: string; body: unknown; headers: http.IncomingHttpHeaders };

/** Servidor HTTP falso que registra las peticiones y responde con `handler`. */
export async function fakeServer(handler: (req: Recorded) => { status: number; body?: unknown } | undefined) {
  const calls: Recorded[] = [];
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      let body: unknown = raw;
      try {
        body = raw ? JSON.parse(raw) : undefined;
      } catch {
        // cuerpo no JSON
      }
      const rec: Recorded = { method: req.method ?? "", url: req.url ?? "", body, headers: req.headers };
      calls.push(rec);
      const r = handler(rec) ?? { status: 200, body: {} };
      res.writeHead(r.status, { "content-type": "application/json" });
      res.end(r.body === undefined ? "" : JSON.stringify(r.body));
    });
  });
  const port = await freePort();
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { port, url: `http://127.0.0.1:${port}`, calls, close: () => new Promise<void>((r) => server.close(() => r())) };
}

/** Petición HTTP cruda (permite fijar Host y leer cuerpo de texto). */
export function rawRequest(opts: { port: number; method?: string; path?: string; headers?: Record<string, string>; body?: string | Buffer }) {
  return new Promise<{ status: number; headers: http.IncomingHttpHeaders; text: string }>((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port: opts.port, method: opts.method ?? "GET", path: opts.path ?? "/", headers: opts.headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, text: Buffer.concat(chunks).toString() }));
      },
    );
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}
