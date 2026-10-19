## Qué es

Un sitio web casi siempre tiene más páginas que las que enlaza. Parte del trabajo de reconocimiento consiste en **descubrir contenido que no aparece en la navegación**: paneles internos, respaldos, versiones antiguas.

Existe un archivo pensado para los buscadores, `robots.txt`, que le dice a los rastreadores qué rutas **no** deben indexar. Es público: cualquiera puede leerlo.

## Objetivo

La tienda guarda una sección interna con una clave. Encuéntrala. La bandera tiene el formato `CYBERLAB{...}`.

## Cómo se mitiga

`robots.txt` no es un control de seguridad: pedirle a un rastreador que no entre no impide que un humano lo haga, y además anuncia dónde están las rutas sensibles. Lo que no debe ser público debe protegerse con autenticación y autorización.
