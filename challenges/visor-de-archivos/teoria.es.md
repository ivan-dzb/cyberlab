## Qué es

El **path traversal** (o directory traversal) ocurre cuando una aplicación construye la ruta de un archivo con un valor que controla el usuario y **no valida** que el resultado siga dentro de la carpeta prevista.

En los sistemas de archivos, `..` significa «la carpeta de arriba». Si la aplicación une `docs/` con lo que el usuario escribe, un nombre como `../../algo` sube de nivel y puede alcanzar archivos que nunca debieron ser públicos: configuraciones, claves, código fuente.

## Objetivo

El visor solo debería mostrar los documentos públicos. La página «Acerca de» menciona dónde guarda la empresa sus archivos internos. Lee el archivo `flag.txt` de esa carpeta. La bandera tiene el formato `CYBERLAB{...}`.

## Cómo se mitiga

- No usar entradas del usuario para construir rutas; preferir identificadores que se traducen a archivos en el servidor (lista permitida).
- Si es inevitable, resolver la ruta final y **comprobar que sigue dentro** del directorio base (`path.resolve` + verificar el prefijo).
- Ejecutar el servicio con un usuario de mínimos privilegios y con acceso solo a lo necesario.
