// Solución de referencia (la usa scripts/test-challenges.mjs). Recibe { request } y devuelve la bandera.
export default async function solve({ request }) {
  const page = await request("/");
  return page.text.match(/CYBERLAB\{[^}]+\}/)?.[0] ?? null;
}
