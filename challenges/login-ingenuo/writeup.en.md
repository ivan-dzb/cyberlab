## Solution

1. Type `'` as the username. The application shows the error and the query:

   ```sql
   SELECT usuario, rol FROM usuarios WHERE usuario = ''' AND clave = ''
   ```

   Your text is pasted directly into the statement.

2. Use `admin'--` as the username and any password. The query becomes:

   ```sql
   SELECT usuario, rol FROM usuarios WHERE usuario = 'admin'--' AND clave = 'x'
   ```

   `--` comments out the rest, so the password condition disappears and the database returns the `admin` user.

3. The application treats you as the administrator and shows the flag.

## What you learned

- When data is mixed with code, the user can change the meaning of the query.
- Detailed error messages make the attacker's work easier.
- Other variants: `' OR '1'='1` (makes the condition always true) or `UNION SELECT` to read other tables.

## How to prevent it

Parameterized queries:

```js
db.prepare("SELECT usuario, rol FROM usuarios WHERE usuario = ? AND clave = ?").get(usuario, clave)
```

Data travels separately from the statement and is never interpreted as SQL. Also store passwords hashed (not in plain text), use a database account with minimal permissions and do not show internal errors.
