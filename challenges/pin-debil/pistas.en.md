Try any PIN and look at the response. How many combinations can a 4-digit PIN have? Does the system slow you down after several failures?
---
There are 10,000 combinations (0000 to 9999) and no attempt limit. Trying them by hand is impractical: automate the requests with a script (Python, bash with `curl`) or a tool such as Burp Intruder or `ffuf`.
---
Send a `POST` request to `/abrir` with the field `pin=XXXX` for each number. The correct response is the only one that does not say "PIN incorrecto" (and it carries the flag).
