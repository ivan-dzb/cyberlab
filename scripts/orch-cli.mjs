// Herramienta de operación/depuración: node scripts/orch-cli.mjs <METHOD> <path> [jsonBody]
// Ejecutar dentro del contenedor app (tiene ORCH_URL y ORCH_TOKEN): docker compose exec app node scripts/orch-cli.mjs GET /sessions
const [, , method = "GET", path = "/sessions", body] = process.argv;
const res = await fetch(process.env.ORCH_URL + path, {
  method,
  headers: { authorization: `Bearer ${process.env.ORCH_TOKEN}`, "content-type": "application/json" },
  body: body || undefined,
});
console.log(res.status, await res.text());
