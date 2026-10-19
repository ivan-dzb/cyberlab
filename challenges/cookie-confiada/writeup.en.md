## Solution

1. Log in with `invitado` / `invitado`. The server responds with a cookie:

   ```
   Set-Cookie: rol=usuario; Path=/
   ```

2. `/admin` answers 403 ("Administrators only"). The role lives in a cookie the browser controls.
3. Change the cookie value to `admin` (in F12 → Application → Cookies, or with `curl`):

   ```bash
   curl -s -H "Cookie: rol=admin" http://<your-session>.lab.localhost:8081/admin
   ```

4. The administration page shows the flag.

## What you learned

- Any data coming from the client (cookies, parameters, headers, hidden fields) can be modified.
- Never use a client value to decide permissions if the server cannot verify it.
- This is a case of **broken access control** (OWASP A01).

## How to prevent it

Keep the role and session on the server and hand the client only a random identifier (or a signed token). Check permissions on every protected request.
