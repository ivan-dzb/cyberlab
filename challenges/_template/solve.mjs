// Solución de referencia del reto. La ejecuta scripts/test-challenges.mjs contra una sesión real
// y comprueba que el valor devuelto es exactamente la bandera de esa sesión.
// `request(path, { method, headers, body })` -> { status, headers, text } (no sigue redirecciones).
export default async function solve({ request }) {
  const page = await request("/");
  return page.text.match(/CYBERLAB\{[^}]+\}/)?.[0] ?? null;
}
