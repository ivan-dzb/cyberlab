## Qué es

Una *bandera* (flag) es una cadena secreta que demuestra que completaste un reto. En este reto la bandera está escondida en una página web simple que corre en **tu propio contenedor**, aislado de la red y de otros usuarios.

## Qué debes saber

Todo lo que un servidor web envía a tu navegador está a tu alcance: el HTML, los comentarios, los encabezados HTTP. El navegador solo muestra una parte. Las herramientas para desarrolladores (F12) te dejan ver el resto.

## Objetivo

Encuentra la bandera, que tiene el formato `CYBERLAB{...}`.

## Cómo mitigarlo

Nunca pongas secretos en HTML, comentarios o JavaScript que se envía al cliente: cualquiera puede leerlos.
