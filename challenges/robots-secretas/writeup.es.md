## Solución

1. La página principal no tiene enlaces útiles. Pide el archivo que describe el sitio a los rastreadores:

   ```bash
   curl -s http://<tu-sesion>.lab.localhost:8081/robots.txt
   ```

2. Devuelve tres rutas prohibidas:

   ```
   Disallow: /admin/
   Disallow: /respaldo/
   Disallow: /archivos-internos/
   ```

3. `/admin/` responde 403 y `/respaldo/` está vacío: son señuelos. `/archivos-internos/` muestra la clave con la bandera.

## Qué aprendiste

- `robots.txt` es una **fuente de reconocimiento**: lista justo lo que el dueño preferiría esconder.
- Las respuestas distintas (403, 200 vacío, 200 con contenido) ayudan a distinguir qué rutas existen y cuáles importan.
- Las herramientas de descubrimiento de contenido (como `gobuster` o `ffuf`) automatizan este paso con listas de palabras.

## Cómo se evita

Protege lo sensible con autenticación y autorización en el servidor. No uses `robots.txt` para esconder rutas: solo debe indicar a los buscadores qué no indexar.
