---
titulo: Principios de diseño seguro
tiempo_min: 25
ultima_revision: 2026-10-18
---

## Resumen (5 min)

Hay ideas de diseño que se repiten desde los años 70 porque funcionan: reducir privilegios, no depender de una sola barrera, fallar de forma segura y no confiar por defecto. Entenderlas te permite razonar sobre sistemas que nunca has visto.

## Principios esenciales

### Defensa en profundidad
Varias capas de control independientes, de modo que si una falla, otra contiene el daño. Ejemplo: firewall + segmentación + autenticación + cifrado + monitoreo + backups. Ninguna capa es perfecta; juntas elevan el costo del ataque.

### Mínimo privilegio
Cada usuario, proceso o servicio recibe **solo** los permisos necesarios para su tarea y solo el tiempo necesario. Un servicio web no debe correr como administrador; una cuenta de soporte no necesita acceso a nóminas.

### Separación de funciones
Acciones críticas requieren más de una persona o componente (quien aprueba un pago no es quien lo crea).

### Seguridad por defecto y *fail-safe*
La configuración inicial debe ser la segura; ante un error, el sistema debe **denegar** (*fail closed*), no permitir.

### Economía de mecanismo y diseño abierto
Lo simple se audita mejor. La seguridad no debe depender del secreto del diseño (*principio de Kerckhoffs*), sino del secreto de las claves.

### Mediación completa
Cada acceso a cada recurso se verifica, siempre; sin atajos por "ya autenticó antes".

### Zero Trust
Formalizado por el NIST en **SP 800-207** (agosto 2020): se pasa de defender un perímetro a proteger usuarios, activos y recursos. Ninguna ubicación de red ni la propiedad del dispositivo otorga **confianza implícita**; la autenticación y autorización de usuario y dispositivo ocurren **antes** de iniciar cada sesión con un recurso. No es un producto, es un enfoque de arquitectura.

## Cómo se ataca la ausencia de estos principios

- Sin mínimo privilegio, comprometer un servicio otorga control total (escalada de privilegios).
- Sin defensa en profundidad, una sola vulnerabilidad web expone toda la red interna.
- Con confianza implícita en la red interna, un atacante que entra por un phishing se mueve lateralmente sin resistencia.

## Cómo se defiende

Aplicar los principios como **revisión de diseño**: para cada componente pregunta (1) ¿qué privilegios tiene realmente?, (2) ¿qué pasa si falla o es comprometido?, (3) ¿qué otra capa lo contiene?, (4) ¿qué verifica cada acceso?

## Errores comunes

- Confundir "tener un firewall" con defensa en profundidad.
- Dar permisos amplios "temporalmente" que nunca se revocan.
- Creer que Zero Trust se compra: es una estrategia con identidad, dispositivos, red, datos y monitoreo continuo.
- Seguridad por oscuridad como única protección.

## Para practicar

Revisa tu laboratorio (M11 cuando lo montes): ¿qué servicio corre con más privilegios de los que necesita? ¿Qué capa contiene el daño si cae?

## Referencias

- [NIST SP 800-207 – Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final)
- Saltzer & Schroeder, *The Protection of Information in Computer Systems* (1975) – clásico de principios de diseño.
