## Solution

1. Open the challenge. The page only says "Nothing to see here".
2. Show the source: `Ctrl+U`, or `curl` from a terminal:

   ```bash
   curl -s http://<your-session>.lab.localhost:8081/
   ```

3. Inside the HTML there is a comment with the flag:

   ```html
   <!-- note for the team: the flag is CYBERLAB{...} -->
   ```

4. Submit the flag in the challenge form.

## What you learned

- The browser only **draws** part of what the server sends. Comments, headers and scripts also reach the client.
- `curl` and developer tools (F12) show the complete response.

## How to prevent it

Don't put secrets in HTML, comments or JavaScript sent to the browser. Anything that reaches the client can be read by the user.
