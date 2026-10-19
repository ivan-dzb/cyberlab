// Reto "Un login demasiado confiado". Vulnerabilidad deliberada: inyección SQL por concatenación.
// Motor SQL real (SQLite en memoria, sin archivos). La bandera la inyecta el orquestador (FLAG).
const http = require("node:http");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const flag = process.env.FLAG || "CYBERLAB{sin-bandera-en-local}";

const db = new DatabaseSync(":memory:");
db.exec("CREATE TABLE usuarios (id INTEGER PRIMARY KEY, usuario TEXT, clave TEXT, rol TEXT)");
const insert = db.prepare("INSERT INTO usuarios (usuario, clave, rol) VALUES (?, ?, ?)");
insert.run("admin", crypto.randomBytes(16).toString("hex"), "admin"); // clave aleatoria: no se puede adivinar
insert.run("ana", "ana123", "usuario");
insert.run("luis", "luis123", "usuario");

const layout = (title, body) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui;max-width:36rem;margin:3rem auto;line-height:1.6">${body}</body></html>`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const form = (extra = "") => layout(
  "Acceso",
  `<h1>Acceso al sistema</h1>${extra}
   <form method="post" action="/login">
     <p><label>Usuario <input name="usuario" required></label></p>
     <p><label>Clave <input name="clave" type="password" required></label></p>
     <button>Entrar</button>
   </form>`,
);

async function body(req) {
  let raw = "";
  for await (const c of req) {
    raw += c;
    if (raw.length > 2048) break;
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

    if (req.method === "POST" && url.pathname === "/login") {
      const { usuario = "", clave = "" } = await body(req);
      // FALLO DELIBERADO: la consulta se arma pegando el texto del usuario.
      const sql = `SELECT usuario, rol FROM usuarios WHERE usuario = '${usuario}' AND clave = '${clave}'`;
      let row;
      try {
        row = db.prepare(sql).get();
      } catch (err) {
        return send(500, form(`<p style="color:#b00"><b>Error de base de datos:</b> ${esc(err.message)}</p><pre>${esc(sql)}</pre>`));
      }
      if (!row) return send(401, form("<p style='color:#b00'>Usuario o clave incorrectos.</p>"));
      if (row.rol === "admin") {
        return send(200, layout("Administración", `<h1>Bienvenido, ${esc(row.usuario)}</h1><p>Clave del archivo central: <code>${flag}</code></p>`));
      }
      return send(200, layout("Inicio", `<h1>Bienvenido, ${esc(row.usuario)}</h1><p>No tienes permisos de administrador.</p>`));
    }

    send(404, layout("No encontrado", "<h1>404</h1>"));
  })
  .listen(8080, "0.0.0.0");
