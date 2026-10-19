// Reto "La cookie que decide quién eres". Vulnerabilidad deliberada: el rol vive en una cookie
// sin firmar y el servidor la cree tal cual. La bandera la inyecta el orquestador (FLAG).
const http = require("node:http");

const flag = process.env.FLAG || "CYBERLAB{sin-bandera-en-local}";

const layout = (title, body) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui;max-width:36rem;margin:3rem auto;line-height:1.6">${body}</body></html>`;

const cookies = (req) =>
  Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((c) => c.trim().split("="))
      .filter((p) => p[0])
      .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]),
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
    const send = (status, html, headers = {}) => {
      res.writeHead(status, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...headers });
      res.end(html);
    };

    if (req.method === "GET" && url.pathname === "/") {
      return send(
        200,
        layout(
          "Portal de empleados",
          `<h1>Portal de empleados</h1>
           <form method="post" action="/login">
             <p><label>Usuario <input name="usuario" required></label></p>
             <p><label>Clave <input name="clave" type="password" required></label></p>
             <button>Entrar</button>
           </form>
           <p><small>Cuenta de invitado: <code>invitado</code> / <code>invitado</code></small></p>`,
        ),
      );
    }

    if (req.method === "POST" && url.pathname === "/login") {
      const { usuario, clave } = await body(req);
      if (usuario === "invitado" && clave === "invitado") {
        return send(302, "", { location: "/panel", "set-cookie": "rol=usuario; Path=/" });
      }
      return send(401, layout("Error", "<h1>Credenciales incorrectas</h1><p><a href='/'>Volver</a></p>"));
    }

    if (url.pathname === "/panel") {
      const rol = cookies(req).rol;
      if (!rol) return send(302, "", { location: "/" });
      return send(200, layout("Panel", `<h1>Panel</h1><p>Sesión iniciada. Tu rol: <b>${rol.replace(/[<>&"]/g, "")}</b>.</p><p><a href="/admin">Zona de administración</a></p>`));
    }

    if (url.pathname === "/admin") {
      if (cookies(req).rol === "admin") {
        return send(200, layout("Administración", `<h1>Administración</h1><p>Clave maestra: <code>${flag}</code></p>`));
      }
      return send(403, layout("Prohibido", "<h1>403</h1><p>Solo administradores.</p>"));
    }

    send(404, layout("No encontrado", "<h1>404</h1>"));
  })
  .listen(8080, "0.0.0.0");
