# Fuentes – M08 Conceptos y principios de seguridad

Consultadas el 2026-10-18.

## Verificadas contra fuente primaria

| Fuente | URL | Qué aporta |
|---|---|---|
| NIST CSWP 29 – Cybersecurity Framework 2.0 (26-feb-2024) | https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf | Seis funciones (Govern, Identify, Protect, Detect, Respond, Recover); definición de Govern |
| NIST CSRC Glossary – Confidentiality | https://csrc.nist.gov/glossary/term/confidentiality | Definición de confidencialidad (44 U.S.C. § 3552) |
| NIST CSRC Glossary – Integrity | https://csrc.nist.gov/glossary/term/integrity | Definición de integridad (FIPS 200, 44 U.S.C. § 3542) |
| NIST SP 800-207 – Zero Trust Architecture (ago-2020) | https://csrc.nist.gov/pubs/sp/800/207/final | Resumen: sin confianza implícita por ubicación; autenticación/autorización antes de cada sesión |
| FIRST – CVSS v4.0 Specification (v1.2, corrección 2024-06-18) | https://www.first.org/cvss/specification-document | Grupos de métricas, métricas Base, escala cualitativa, nomenclatura CVSS-B/BT/BE/BTE |
| FIRST – EPSS | https://www.first.org/epss/ | Probabilidad de explotación en 30 días, score 0–1 + percentil diario |
| CISA – KEV Catalog | https://www.cisa.gov/known-exploited-vulnerabilities-catalog | KEV = fuente de vulnerabilidades explotadas in the wild; uso como entrada de priorización |
| MITRE CWE – About | https://cwe.mitre.org/about/index.html | CWE = lista comunitaria de debilidades de software/hardware |

## Fuentes secundarias (verificar contra texto oficial)

- Cobertura de **CISA BOD 26-04** (10-jun-2026; reemplaza BOD 19-02 y BOD 22-01; ventanas de 3/14/60 días o diferir): SecurityWeek, Wiley, Cloud Security Alliance. **Pendiente**: leer el texto de la directiva en cisa.gov y confirmar las variables y plazos exactos.
- Las siete tenets de Zero Trust (800-207 §2.1): confirmadas solo por fuentes secundarias; la página de CSRC no las lista. **Pendiente**: leer el PDF de SP 800-207.

## Conocimiento general no verificado en esta pasada

- Taxonomía de actores de amenaza (lección 04) y principios de diseño de Saltzer & Schroeder (lección 03): material clásico y estable; **pendiente** contrastar con el último Verizon DBIR y M-Trends antes de añadir cifras. La lección no incluye estadísticas por esa razón.
- Formato y gobernanza de CVE (cve.org no cargó contenido útil): descrito a nivel general.

## Hallazgo relevante de la investigación

El catálogo KEV ya refiere a **BOD 26-04**, que sustituye a BOD 22-01; material antiguo que cita 22-01 está desactualizado.
