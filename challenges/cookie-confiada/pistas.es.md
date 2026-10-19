Inicia sesión con la cuenta de invitado y observa qué te permite hacer el panel. ¿Qué guarda el navegador después de iniciar sesión?
---
Abre las herramientas de desarrollador (F12) → pestaña *Application* (o *Almacenamiento*) → *Cookies*. Verás una cookie llamada `rol`.
---
El servidor decide el acceso a `/admin` leyendo esa cookie. Cambia su valor por uno que tenga más privilegios y recarga `/admin`.
