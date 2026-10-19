## Solución

1. Abre el reto. La página solo dice «Aquí no hay nada que ver».
2. Muestra el código fuente: `Ctrl+U`, o `curl` desde una terminal:

   ```bash
   curl -s http://<tu-sesion>.lab.localhost:8081/
   ```

3. Dentro del HTML hay un comentario con la bandera:

   ```html
   <!-- nota para el equipo: la bandera es CYBERLAB{...} -->
   ```

4. Envía la bandera en el formulario del reto.

## Qué aprendiste

- El navegador solo **dibuja** parte de lo que el servidor envía. Los comentarios, los encabezados y los scripts también llegan al cliente.
- `curl` y las herramientas de desarrollador (F12) muestran la respuesta completa.

## Cómo se evita

No pongas secretos en el HTML, en comentarios ni en JavaScript que se envía al navegador. Cualquier cosa que llegue al cliente puede ser leída por el usuario.
