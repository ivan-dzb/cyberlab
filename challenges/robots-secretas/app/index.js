// Reto "Rutas que nadie debería ver". La bandera la inyecta el orquestador por sesión (FLAG).
const http = require("node:http");

const flag = process.env.FLAG || "CYBERLAB{sin-bandera-en-local}";

const layout = (title, body) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui;max-width:40rem;margin:3rem auto;line-height:1.6">${body}</body></html>`;

const pages = {
  "/": layout("Tienda ACME", "<h1>Tienda ACME</h1><p>Herramientas y repuestos desde 1987.</p><ul><li>Martillos</li><li>Tornillos</li><li>Cinta métrica</li></ul>"),
  "/archivos-internos/": layout("Archivos internos", `<h1>Archivos internos</h1><p>Uso exclusivo del personal.</p><p>Clave de acceso al almacén: <code>${flag}</code></p>`),
  "/respaldo/": layout("Respaldo", "<h1>Respaldo</h1><p>Directorio vacío.</p>"),
};

const robots = `User-agent: *
Disallow: /admin/
Disallow: /respaldo/
Disallow: /archivos-internos/
`;

http
  .createServer((req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    const send = (status, type, body) => {
      res.writeHead(status, { "content-type": `${type}; charset=utf-8`, "cache-control": "no-store" });
      res.end(body);
    };
    if (path === "/robots.txt") return send(200, "text/plain", robots);
    if (path === "/admin/") return send(403, "text/html", layout("Acceso denegado", "<h1>403</h1><p>Acceso denegado.</p>"));
    if (pages[path]) return send(200, "text/html", pages[path]);
    send(404, "text/html", layout("No encontrado", "<h1>404</h1><p>No encontrado.</p>"));
  })
  .listen(8080, "0.0.0.0");
