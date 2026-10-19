## Qué es

Una *cookie* es un pequeño dato que el servidor le pide al navegador que guarde y le devuelva en cada petición. Sirve para recordar quién eres.

El problema aparece cuando el servidor guarda en la cookie algo que **decide permisos** (por ejemplo, tu rol) y luego lo acepta sin verificar. Todo lo que está en el navegador lo controla el usuario: puede verlo y modificarlo. A esto se le llama **control de acceso roto** y encabeza la lista OWASP Top 10.

## Objetivo

Entra con la cuenta de invitado que muestra el portal y llega a la zona de administración. La bandera tiene el formato `CYBERLAB{...}`.

## Cómo se mitiga

El estado de la sesión y los permisos se guardan **en el servidor**. La cookie solo lleva un identificador largo, aleatorio e imposible de adivinar, o un valor firmado que el servidor verifica. Cada petición protegida comprueba los permisos en el servidor.
