Prueba un PIN cualquiera y observa la respuesta. ¿Cuántas combinaciones puede tener un PIN de 4 dígitos? ¿El sistema te frena después de varios fallos?
---
Son 10 000 combinaciones (0000 a 9999) y no hay límite de intentos. Probarlas a mano no es práctico: automatiza las peticiones con un script (Python, bash con `curl`) o con una herramienta como Burp Intruder o `ffuf`.
---
Envía una petición `POST` a `/abrir` con el campo `pin=XXXX` por cada número. La respuesta correcta es la única que no dice «PIN incorrecto» (y trae la bandera).
