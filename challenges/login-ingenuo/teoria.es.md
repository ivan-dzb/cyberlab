## Qué es

Una **inyección SQL** ocurre cuando una aplicación construye una consulta a la base de datos **pegando texto que escribe el usuario** dentro de la sentencia. Si ese texto contiene sintaxis SQL, la base de datos no distingue entre *datos* y *código*: lo ejecuta todo.

Por ejemplo, un login típico hace algo así:

```sql
SELECT * FROM usuarios WHERE usuario = '<lo que escribes>' AND clave = '<lo que escribes>'
```

Si lo que escribes incluye una comilla simple, puedes cerrar el texto y cambiar la lógica de la consulta. Es una de las vulnerabilidades web más antiguas y sigue en el OWASP Top 10 (*Injection*).

## Objetivo

Entra como administrador sin conocer su clave. La bandera tiene el formato `CYBERLAB{...}`.

## Cómo se mitiga

Usa **consultas parametrizadas** (*prepared statements*): la sentencia y los datos viajan por separado, y los datos nunca se interpretan como SQL. Además, aplica el mínimo privilegio a la cuenta de base de datos y no muestres errores internos al usuario.
