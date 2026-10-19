// Solución de referencia: leer robots.txt y visitar cada ruta prohibida.
const FLAG = /CYBERLAB\{[^}]+\}/;

export default async function solve({ request }) {
  const robots = await request("/robots.txt");
  const paths = [...robots.text.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1]);
  for (const p of paths) {
    const page = await request(p);
    const found = page.text.match(FLAG)?.[0];
    if (found) return found;
  }
  return null;
}
