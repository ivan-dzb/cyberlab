## Qué es

**IDOR** (*Insecure Direct Object Reference*, referencia directa insegura a objetos) ocurre cuando una aplicación usa un identificador que el usuario puede ver o cambiar (un número en la URL, un parámetro) para localizar un recurso, pero **no comprueba que ese recurso le pertenezca**.

Que el usuario haya iniciado sesión no basta: la autenticación responde «¿quién eres?» y la autorización responde «¿puedes ver *esto*?». Es una forma de **control de acceso roto**.

## Objetivo

Entra con la cuenta de prueba, revisa tus facturas y accede a una que no es tuya: la de dirección. La bandera tiene el formato `CYBERLAB{...}`.

## Cómo se mitiga

En el servidor, cada vez que se accede a un recurso se comprueba que pertenece al usuario autenticado (o que tiene permiso). Los identificadores impredecibles (UUID) ayudan, pero no sustituyen la comprobación de propiedad.
