## Solution

1. Log in with `ana` / `ana2024`. You will see two invoices: `/facturas/1042` and `/facturas/1043`.
2. The identifier is a sequential number in the URL. Try other values:

   ```bash
   curl -s -H "Cookie: sid=<your-cookie>" http://<your-session>.lab.localhost:8081/facturas/1001
   ```

3. Invoice `1001` belongs to management and its internal note holds the flag. The server returns it even though it is not `ana`'s.

## What you learned

- Authentication ("who are you?") is not authorization ("may you see this?").
- Sequential identifiers make it trivial to walk every resource. It can be automated with a script or tools like Burp Intruder.
- It is a case of **broken access control** (OWASP A01), in its IDOR variant.

## How to prevent it

Before returning a resource, the server checks it belongs to the authenticated user:

```js
if (invoice.owner !== user) return res.status(403)
```

Random identifiers (UUIDs) make guessing harder, but the ownership check is still mandatory.
