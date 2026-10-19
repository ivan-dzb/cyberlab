// Reto "La caja de cuatro dígitos". Vulnerabilidad deliberada: PIN de solo 10 000 combinaciones
// y sin límite de intentos. El PIN es aleatorio por sesión; la bandera la inyecta el orquestador (FLAG).
const http = require("node:http");
const crypto = require("node:crypto");

const flag = process.env.FLAG || "CYBERLAB{sin-bandera-en-local}";
const pin = String(crypto.randomInt(0, 10000)).padStart(4, "0");

const layout = (title, body) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui;max-width:32rem;margin:3rem auto;line-height:1.6">${body}</body></html>`;

const form = (msg = "") => layout(
  "Caja fuerte",
  `<h1>Caja fuerte digital</h1><p>Introduce el PIN de 4 dígitos.</p>${msg}
   <form method="post" action="/abrir">
     <p><input name="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required autofocus></p>
     <button>Abrir</button>
   </form>`,
);

async function body(req) {
  let raw = "";
  for await (const c of req) {
    raw += c;
    if (raw.length > 256) break;
  }
  return Object.fromEntries(new URLSearchParams(raw));
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    const send = (status, html) => {
      res.writeHead(status, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(html);
    };
    if (req.method === "GET" && url.pathname === "/") return send(200, form());
    if (req.method === "POST" && url.pathname === "/abrir") {
      const given = (await body(req)).pin ?? "";
      // FALLO DELIBERADO: sin límite de intentos, sin retardo, sin bloqueo.
      if (given === pin) return send(200, layout("Abierta", `<h1>Caja abierta</h1><p>Contenido: <code>${flag}</code></p>`));
      return send(403, form("<p style='color:#b00'>PIN incorrecto.</p>"));
    }
    send(404, layout("No encontrado", "<h1>404</h1>"));
  })
  .listen(8080, "0.0.0.0");
