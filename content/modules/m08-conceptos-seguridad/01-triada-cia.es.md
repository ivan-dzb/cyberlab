---
titulo: La tríada CIA y sus extensiones
tiempo_min: 20
ultima_revision: 2026-10-18
---

## Resumen (5 min)

Casi toda la seguridad de la información se puede describir como la protección de tres propiedades: **Confidencialidad**, **Integridad** y **Disponibilidad** (*CIA*). Cuando alguien dice "esto es un problema de seguridad", pregúntate: ¿qué propiedad se rompió?

## Las tres propiedades

| Propiedad | Definición (NIST) | Se rompe cuando… | Ejemplo |
|---|---|---|---|
| **Confidencialidad** | "Preservar las restricciones autorizadas de acceso y divulgación de la información" | alguien no autorizado la ve | fuga de una base de datos de clientes |
| **Integridad** | "Protegerse contra la modificación o destrucción indebida de la información"; incluye *no repudio* y autenticidad | alguien la altera sin permiso | un atacante cambia el destino de una transferencia |
| **Disponibilidad** | acceso oportuno y fiable a la información y a los servicios | no puedes usarla cuando la necesitas | ransomware que cifra los servidores |

Las definiciones de confidencialidad e integridad provienen del glosario del NIST (basadas en 44 U.S.C. §§ 3552 y 3542, FIPS 200).

## Extensiones habituales

- **Autenticidad**: ¿es quien dice ser (usuario, sistema, mensaje)? Se apoya en autenticación y firmas.
- **No repudio**: el emisor no puede negar haber realizado una acción (firmas digitales, logs a prueba de manipulación).
- **AAA**: *Authentication* (¿quién eres?), *Authorization* (¿qué puedes hacer?), *Accounting* (¿qué hiciste?). Son los mecanismos que implementan CIA.
- **Privacidad** y **seguridad (safety)**: en sistemas médicos o industriales una falla de integridad puede dañar personas, no solo datos. CVSS v4.0 incluye métricas de *Safety* por esto.

## Los trade-offs son la norma

Las propiedades chocan. Cifrar todo mejora la confidencialidad pero complica la recuperación (disponibilidad). Un sistema de alarma hospitalario prioriza disponibilidad e integridad sobre confidencialidad. **Un buen profesional pregunta qué propiedad importa más en cada contexto.**

## Cómo se ataca (visión conceptual)

- Confidencialidad: *sniffing*, inyección SQL que extrae datos, credenciales robadas.
- Integridad: manipulación de parámetros, *man-in-the-middle*, malware que altera archivos.
- Disponibilidad: DoS/DDoS, ransomware, borrado de datos.

Verás las técnicas concretas en los módulos web, red y malware, siempre en laboratorio.

## Cómo se defiende

- Confidencialidad: cifrado en tránsito y en reposo, control de acceso, clasificación de datos.
- Integridad: hashes y firmas, control de versiones, validación de entradas, backups verificados.
- Disponibilidad: redundancia, backups (3-2-1), límites de tasa, planes de continuidad.

## Errores comunes

- Reducir "seguridad" a confidencialidad e ignorar integridad y disponibilidad.
- Creer que cifrar equivale a proteger la integridad (el cifrado sin autenticación puede ser manipulable; verás AEAD/GCM en M06).
- No definir qué datos son críticos antes de decidir controles.

## Para practicar

Toma tres incidentes públicos recientes y clasifica qué propiedad(es) de CIA se rompieron y cómo.

## Referencias

- [NIST Glossary – Confidentiality](https://csrc.nist.gov/glossary/term/confidentiality)
- [NIST Glossary – Integrity](https://csrc.nist.gov/glossary/term/integrity)
- [FIRST – CVSS v4.0](https://www.first.org/cvss/specification-document)
