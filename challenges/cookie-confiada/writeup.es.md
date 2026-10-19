## Solución

1. Inicia sesión con `invitado` / `invitado`. El servidor responde con una cookie:

   ```
   Set-Cookie: rol=usuario; Path=/
   ```

2. `/admin` responde 403 («Solo administradores»). El rol está en una cookie que el navegador controla.
3. Cambia el valor de la cookie a `admin` (en F12 → Application → Cookies, o con `curl`):

   ```bash
   curl -s -H "Cookie: rol=admin" http://<tu-sesion>.lab.localhost:8081/admin
   ```

4. La página de administración muestra la bandera.

## Qué aprendiste

- Todo dato que viaja desde el cliente (cookies, parámetros, cabeceras, campos ocultos) puede modificarse.
- Nunca se debe usar un valor del cliente para decidir permisos si el servidor no lo puede verificar.
- Es un caso de **control de acceso roto** (OWASP A01).

## Cómo se evita

Guarda el rol y la sesión en el servidor y entrega al cliente solo un identificador aleatorio (o un token firmado). Verifica los permisos en cada petición protegida.
