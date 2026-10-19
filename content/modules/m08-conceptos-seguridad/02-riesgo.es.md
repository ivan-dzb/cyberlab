---
titulo: "Riesgo: amenaza, vulnerabilidad e impacto"
tiempo_min: 25
ultima_revision: 2026-10-18
---

## Resumen (5 min)

La seguridad no busca "cero riesgo" (imposible) sino **gestionarlo**: entender qué puede pasar, qué tan probable es, cuánto dolería y qué hacer al respecto.

## Los ingredientes

- **Activo**: lo que tiene valor (datos, sistemas, reputación, personas).
- **Amenaza**: algo o alguien que puede causar daño (un atacante, un malware, un error humano, un incendio).
- **Vulnerabilidad**: una debilidad que la amenaza puede aprovechar (software sin parchear, contraseña débil, proceso ausente).
- **Probabilidad** (*likelihood*) e **impacto**: qué tan posible es y qué tan grave sería.
- **Control** (o contramedida): lo que reduce probabilidad o impacto.

Relación simplificada: **riesgo ≈ probabilidad × impacto**, donde la probabilidad depende de que exista una amenaza capaz *y* una vulnerabilidad explotable. Sin vulnerabilidad o sin amenaza, el riesgo de ese escenario es bajo.

## Cuatro formas de tratar un riesgo

1. **Mitigar**: aplicar controles (parchear, MFA, segmentar).
2. **Transferir**: seguros, contratos con terceros.
3. **Aceptar**: asumirlo conscientemente (documentado, con responsable).
4. **Evitar**: eliminar la actividad que lo causa.

Lo que queda tras los controles es el **riesgo residual**.

## Severidad ≠ riesgo

Una vulnerabilidad "crítica" en un servidor aislado puede importar menos que una "media" en un servicio expuesto a Internet y ya explotado. El riesgo depende del **contexto**: exposición, valor del activo, controles compensatorios y evidencia de explotación activa. Lo verás aplicado en la lección 05.

## El marco NIST CSF 2.0

El *Cybersecurity Framework 2.0* (NIST, 26-feb-2024) organiza la gestión del riesgo en **seis funciones**:

| Función | Idea central |
|---|---|
| **Govern (GV)** | Estrategia, políticas, roles y supervisión del riesgo de ciberseguridad (incluye contexto organizacional y riesgo de la cadena de suministro). *Nueva en 2.0.* |
| **Identify (ID)** | Entender activos, riesgos y contexto actuales |
| **Protect (PR)** | Salvaguardas: identidad y acceso, formación, seguridad de datos y plataformas |
| **Detect (DE)** | Encontrar y analizar posibles ataques y compromisos |
| **Respond (RS)** | Actuar ante un incidente detectado |
| **Recover (RC)** | Restaurar operaciones y servicios afectados |

Es un marco voluntario aplicable a organizaciones de cualquier tamaño o sector.

## Cómo se aplica en la práctica

Para cualquier sistema: lista los activos → identifica amenazas realistas → busca vulnerabilidades → estima impacto/probabilidad → elige controles → registra lo que aceptas. Un **registro de riesgos** es el documento vivo donde se guarda esto (se profundiza en M47).

## Errores comunes

- Tratar todo como crítico (si todo es prioridad, nada lo es).
- Medir solo la vulnerabilidad e ignorar el activo afectado.
- Aceptar riesgos sin dueño ni fecha de revisión.
- Pensar que el riesgo es solo técnico: también hay riesgo legal, operativo y reputacional.

## Para practicar

Elige un servicio que uses (correo, banca). Enumera 3 activos, 3 amenazas, 3 vulnerabilidades posibles y un control por cada escenario.

## Referencias

- [NIST CSWP 29 – Cybersecurity Framework 2.0](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf)
