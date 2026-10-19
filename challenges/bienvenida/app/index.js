// Reto "Bienvenida". La bandera la inyecta el orquestador por sesión (FLAG); no está en la imagen.
const http = require("node:http");

const flag = process.env.FLAG || "CYBERLAB{sin-bandera-en-local}";

const page = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Portal interno</title></head>
<body style="font-family:system-ui;max-width:36rem;margin:4rem auto">
  <h1>Portal interno</h1>
  <p>Aquí no hay nada que ver. Sigue circulando.</p>
  <!-- nota para el equipo: la bandera es ${flag} -->
</body>
</html>`;

http
  .createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(page);
  })
  .listen(8080, "0.0.0.0");
