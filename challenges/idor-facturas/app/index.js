// Reto "Facturas ajenas". Vulnerabilidad deliberada (IDOR): /facturas/:id exige sesión, pero no
// comprueba que la factura pertenezca al usuario. La bandera la inyecta el orquestador (FLAG).
const http = require("node:http");
const crypto = require("node:crypto");

const flag = process.env.FLAG || "CYBERLAB{sin-bandera-en-local}";

const users = { ana: "ana2024" };
const sessions = new Map(); // token aleatorio -> usuario (la sesión es correcta; el fallo está en la autorización)

const conceptos = ["Papelería", "Mantenimiento", "Licencias", "Transporte", "Capacitación", "Hosting", "Limpieza"];
const invoices = new Map();
// Facturas de relleno de otros clientes: 1001 a 1041.
for (let id = 1001; id <= 1041; id++) {
  invoices.set(id, { id, owner: "otros", concepto: conceptos[id % conceptos.length], monto: 100 + ((id * 37) % 900), nota: "" });
}
invoices.get(1001).owner = "direccion";
invoices.get(1001).concepto = "Honorarios de consultoría";
invoices.get(1001).nota = `Uso interno de dirección. Clave del archivo: ${flag}`;
invoices.set(1042, { id: 1042, owner: "ana", concepto: "Material de oficina", monto: 320, nota: "Pagada" });
invoices.set(1043, { id: 1043, owner: "ana", concepto: "Suscripción anual", monto: 1200, nota: "Pendiente" });

const layout = (title, body) => `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:system-ui;max-width:36rem;margin:3rem auto;line-height:1.6">${body}</body></html>`;

const cookies = (req) =>
  Object.fromEntries((req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).filter((p) => p[0]));

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
    const user = sessions.get(cookies(req).sid);
    const send = (status, html, headers = {}) => {
      res.writeHead(status, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...headers });
      res.end(html);
    };

    if (req.method === "GET" && url.pathname === "/") {
      return send(
        200,
        layout(
          "Portal de facturación",
          `<h1>Portal de facturación</h1>
           <form method="post" action="/login">
             <p><label>Usuario <input name="usuario" required></label></p>
             <p><label>Clave <input name="clave" type="password" required></label></p>
             <button>Entrar</button>
           </form>
           <p><small>Cliente de prueba: <code>ana</code> / <code>ana2024</code></small></p>`,
        ),
      );
    }

    if (req.method === "POST" && url.pathname === "/login") {
      const { usuario, clave } = await body(req);
      if (Object.hasOwn(users, usuario) && users[usuario] === clave) {
        const token = crypto.randomBytes(16).toString("hex");
        sessions.set(token, usuario);
        return send(302, "", { location: "/facturas", "set-cookie": `sid=${token}; Path=/; HttpOnly` });
      }
      return send(401, layout("Error", "<h1>Credenciales incorrectas</h1><p><a href='/'>Volver</a></p>"));
    }

    if (!user) return send(401, layout("Sesión requerida", "<h1>401</h1><p>Inicia sesión.</p><p><a href='/'>Ir al inicio</a></p>"));

    if (url.pathname === "/facturas") {
      const mine = [...invoices.values()].filter((i) => i.owner === user);
      const rows = mine.map((i) => `<li><a href="/facturas/${i.id}">Factura #${i.id}</a> — ${i.concepto}</li>`).join("");
      return send(200, layout("Mis facturas", `<h1>Mis facturas</h1><p>Sesión: ${user}</p><ul>${rows}</ul>`));
    }

    const m = url.pathname.match(/^\/facturas\/(\d{1,6})$/);
    if (m) {
      const inv = invoices.get(Number(m[1]));
      if (!inv) return send(404, layout("No encontrada", "<h1>404</h1><p>Factura inexistente.</p>"));
      // FALLO DELIBERADO: no se comprueba inv.owner === user.
      return send(
        200,
        layout(
          `Factura #${inv.id}`,
          `<h1>Factura #${inv.id}</h1><p>Concepto: ${inv.concepto}</p><p>Monto: $${inv.monto}</p><p>Nota: ${inv.nota || "—"}</p><p><a href="/facturas">Volver</a></p>`,
        ),
      );
    }

    send(404, layout("No encontrado", "<h1>404</h1>"));
  })
  .listen(8080, "0.0.0.0");
