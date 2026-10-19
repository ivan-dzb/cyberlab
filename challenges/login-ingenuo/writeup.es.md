## Solución

1. Escribe `'` como usuario. La aplicación muestra el error y la consulta:

   ```sql
   SELECT usuario, rol FROM usuarios WHERE usuario = ''' AND clave = ''
   ```

   Tu texto se pega directamente dentro de la sentencia.

2. Usa `admin'--` como usuario y cualquier clave. La consulta queda así:

   ```sql
   SELECT usuario, rol FROM usuarios WHERE usuario = 'admin'--' AND clave = 'x'
   ```

   `--` comenta el resto, así que la condición de la clave desaparece y la base devuelve al usuario `admin`.

3. La aplicación te trata como administrador y muestra la bandera.

## Qué aprendiste

- Cuando los datos se mezclan con el código, el usuario puede cambiar el significado de la consulta.
- Los mensajes de error detallados facilitan el trabajo del atacante.
- Otras variantes: `' OR '1'='1` (hace la condición siempre verdadera) o `UNION SELECT` para leer otras tablas.

## Cómo se evita

Consultas parametrizadas:

```js
db.prepare("SELECT usuario, rol FROM usuarios WHERE usuario = ? AND clave = ?").get(usuario, clave)
```

Los datos viajan separados de la sentencia y nunca se interpretan como SQL. Además, guarda las claves con hash (no en texto plano), usa una cuenta de base de datos con el mínimo de permisos y no muestres errores internos.
