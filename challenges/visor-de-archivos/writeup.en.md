## Solution

1. The document list links to `/ver?archivo=faq.txt`: the file name travels in the URL.
2. The `acerca.txt` document reveals that internal files are in `/tmp/secreto`.
3. The server joins the `docs` folder with your text without validating it. The real folder is `/srv/app/docs`, so climbing three levels reaches `/`:

   ```
   /srv/app/docs/../../../tmp/secreto/flag.txt  →  /tmp/secreto/flag.txt
   ```

4. Request that path:

   ```bash
   curl -s "http://<your-session>.lab.localhost:8081/ver?archivo=../../../tmp/secreto/flag.txt"
   ```

## What you learned

- Any user-controlled value that ends up in a file path is an attack surface.
- `../` lets you leave the intended directory; there are also encoded variants (`..%2f`) and absolute paths.
- With path traversal you can read system files (`/etc/passwd`, configuration, keys, source code).

## How to prevent it

Resolve the final path and verify it is still inside the base directory:

```js
const base = path.resolve(DOCS);
const ruta = path.resolve(base, nombre);
if (!ruta.startsWith(base + path.sep)) return res.status(400)
```

Better still: don't accept free-form file names, use an allowlist of identifiers. Run the service as a user that can only read what it needs.
