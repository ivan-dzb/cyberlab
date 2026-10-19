// Reto "El visor que sale de su carpeta". Vulnerabilidad deliberada: path traversal, el nombre de
// archivo se une al directorio sin validar. La bandera se escribe en /tmp/secreto/flag.txt al
// arrancar (único lugar escribible) y la inyecta el orquestador (FLAG).
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const flag = process.env.FLAG || "CYBERLAB{sin-bandera-en-local}";
const DOCS = path.join(__dirname, "docs");

fs.mkdirSync("/tmp/secreto", { recursive: true });
fs.writeFileSync("/tmp/secreto/flag.txt", `${flag}\n`);

const layout = (title, body) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui;max-width:36rem;margin:3rem auto;line-height:1.6">${body}</body></html>`;

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const send = (status, type, text) => {
      res.writeHead(status, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
      res.end(text);
    };

    if (url.pathname === "/") {
      const links = fs.readdirSync(DOCS).map((f) => `<li><a href="/ver?archivo=${encodeURIComponent(f)}">${f}</a></li>`).join("");
      return send(200, "text/html", layout("Documentos", `<h1>Documentos públicos</h1><ul>${links}</ul>`));
    }

    if (url.pathname === "/ver") {
      const nombre = url.searchParams.get("archivo") || "";
      // FALLO DELIBERADO: path.join normaliza "../" y permite salir de DOCS.
      const ruta = path.join(DOCS, nombre);
      try {
        return send(200, "text/plain", fs.readFileSync(ruta, "utf8"));
      } catch {
        return send(404, "text/plain", "Archivo no encontrado");
      }
    }

    send(404, "text/html", layout("No encontrado", "<h1>404</h1>"));
  })
  .listen(8080, "0.0.0.0");
