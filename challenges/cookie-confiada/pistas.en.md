Log in with the guest account and notice what the panel lets you do. What does the browser store after you log in?
---
Open developer tools (F12) → *Application* (or *Storage*) tab → *Cookies*. You will see a cookie named `rol`.
---
The server decides access to `/admin` by reading that cookie. Change its value to one with more privileges and reload `/admin`.
