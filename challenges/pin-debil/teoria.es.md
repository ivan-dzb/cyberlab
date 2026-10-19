## Qué es

Un ataque de **fuerza bruta** consiste en probar todas las combinaciones posibles hasta dar con la correcta. Es viable cuando el espacio de posibilidades es pequeño **y** el sistema no frena los intentos.

Un PIN de 4 dígitos tiene solo 10 000 combinaciones. Probarlas a mano es tedioso, pero un programa lo hace en segundos. Por eso la seguridad de un secreto corto depende de que el sistema **limite los intentos**.

## Objetivo

Abre la caja fuerte. El PIN es distinto en cada sesión, así que no se puede memorizar: hay que encontrarlo. La bandera tiene el formato `CYBERLAB{...}`.

## Cómo se mitiga

- Limitar intentos (*rate limiting*) y bloquear temporalmente tras varios fallos.
- Añadir retardos crecientes entre intentos.
- Exigir secretos más largos o un segundo factor.
- Registrar y alertar ante muchos intentos fallidos desde un mismo origen.
