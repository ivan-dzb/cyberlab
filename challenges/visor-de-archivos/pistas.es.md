Abre uno de los documentos y mira la URL: el parámetro `archivo` contiene el nombre del archivo que se lee. Lee también el documento «acerca».
---
El documento «acerca» dice que los archivos internos están en `/tmp/secreto`, fuera de la carpeta de documentos. En una ruta, `..` significa «subir una carpeta».
---
Pon en `archivo` una ruta que suba varios niveles hasta la raíz y baje a `tmp/secreto/flag.txt`. Si no funciona, prueba con más o menos `../`.
---
Por ejemplo: `/ver?archivo=../../../tmp/secreto/flag.txt`.
