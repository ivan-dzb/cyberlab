// Canario de aislamiento. NO es un reto visible (prefijo "_"): lo usa scripts/isolation-test.mjs
// para comprobar, desde DENTRO de un contenedor de reto, que el aislamiento se cumple.
const net = require("node:net");
const dns = require("node:dns").promises;
const http = require("node:http");
const fs = require("node:fs");

const tcp = (host, port, ms = 2000) =>
  new Promise((resolve) => {
    const s = net.connect({ host, port, timeout: ms });
    s.on("connect", () => (s.destroy(), resolve(true)));
    s.on("timeout", () => (s.destroy(), resolve(false)));
    s.on("error", () => resolve(false));
  });

const httpStatus = (host, port, path = "/") =>
  new Promise((resolve) => {
    const req = http.get({ host, port, path, timeout: 2000 }, (res) => (res.resume(), resolve(res.statusCode)));
    req.on("timeout", () => (req.destroy(), resolve(null)));
    req.on("error", () => resolve(null));
  });

const status = () => {
  const out = {};
  for (const line of fs.readFileSync("/proc/self/status", "utf8").split("\n")) {
    const [k, v] = line.split(":\t");
    if (["CapEff", "CapBnd", "NoNewPrivs", "Seccomp"].includes(k)) out[k] = (v || "").trim();
  }
  return out;
};

const defaultGateway = () => {
  try {
    const row = fs.readFileSync("/proc/net/route", "utf8").split("\n").slice(1).map((l) => l.split(/\s+/)).find((c) => c[1] === "00000000");
    if (!row) return null;
    return row[2].match(/../g).reverse().map((h) => parseInt(h, 16)).join(".");
  } catch {
    return null;
  }
};

const writable = (p) => {
  try {
    fs.writeFileSync(p, "x");
    fs.unlinkSync(p);
    return true;
  } catch {
    return false;
  }
};

async function report() {
  const gw = defaultGateway();
  return {
    identity: { uid: process.getuid(), gid: process.getgid() },
    proc: status(),
    fs: { rootWritable: writable("/canary-write-test"), tmpWritable: writable("/tmp/canary-write-test") },
    network: {
      defaultGateway: gw,
      internet: {
        cloudflare443: await tcp("1.1.1.1", 443),
        google53: await tcp("8.8.8.8", 53),
        dnsResolves: await dns.lookup("example.com").then(() => true, () => false),
      },
      host: {
        // Puertos que el host/Docker Desktop publica: 3000 (web), 5432 (db), 8081 (gateway público).
        gateway3000: gw ? await tcp(gw, 3000) : false,
        gateway5432: gw ? await tcp(gw, 5432) : false,
        gateway8081: gw ? await tcp(gw, 8081) : false,
        hostDockerInternal3000: await tcp("host.docker.internal", 3000),
        docker0_3000: await tcp("172.17.0.1", 3000),
      },
      platform: {
        db: await tcp("db", 5432),
        app: await tcp("app", 3000),
        orchestrator: await tcp("orchestrator", 4000),
        dockerproxy: await tcp("dockerproxy", 2375),
        // El gateway sí está en la red de la sesión (es quien sirve el reto): su API admin debe rechazar.
        gatewayAdminStatus: await httpStatus("cyberlab-gateway", 8082, "/routes"),
      },
    },
  };
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    res.setHeader("content-type", "application/json");
    if (url.pathname === "/probe") {
      // Solo para el test: ¿puedo alcanzar host:port?
      const host = url.searchParams.get("host") || "";
      const port = Number(url.searchParams.get("port"));
      if (!/^[a-z0-9.-]{1,80}$/.test(host) || !Number.isInteger(port) || port < 1 || port > 65535) {
        res.statusCode = 400;
        return res.end("{}");
      }
      return res.end(JSON.stringify({ reachable: await tcp(host, port) }));
    }
    res.end(JSON.stringify(await report()));
  })
  .listen(8080, "0.0.0.0");
