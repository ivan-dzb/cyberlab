## Solution

1. The main page has no useful links. Ask for the file that describes the site to crawlers:

   ```bash
   curl -s http://<your-session>.lab.localhost:8081/robots.txt
   ```

2. It returns three disallowed paths:

   ```
   Disallow: /admin/
   Disallow: /respaldo/
   Disallow: /archivos-internos/
   ```

3. `/admin/` answers 403 and `/respaldo/` is empty: they are decoys. `/archivos-internos/` shows the key holding the flag.

## What you learned

- `robots.txt` is a **reconnaissance source**: it lists exactly what the owner would rather hide.
- Different responses (403, empty 200, 200 with content) help tell which paths exist and which matter.
- Content discovery tools (such as `gobuster` or `ffuf`) automate this step with wordlists.

## How to prevent it

Protect sensitive things with server-side authentication and authorization. Don't use `robots.txt` to hide paths: it should only tell search engines what not to index.
