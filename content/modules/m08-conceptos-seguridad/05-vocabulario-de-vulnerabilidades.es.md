---
titulo: "Vocabulario: CVE, CWE, CVSS, EPSS y KEV"
tiempo_min: 30
ultima_revision: 2026-10-18
---

## Resumen (5 min)

Cinco siglas aparecen en cada informe de vulnerabilidades. Responden preguntas distintas:

| Sigla | Pregunta que responde |
|---|---|
| **CVE** | ¿Cómo se llama *esta* vulnerabilidad concreta? |
| **CWE** | ¿Qué *tipo* de debilidad es? |
| **CVSS** | ¿Qué tan *grave* es en abstracto? |
| **EPSS** | ¿Qué tan *probable* es que la exploten pronto? |
| **KEV** | ¿Ya la están explotando *de verdad*? |

## CVE – el identificador

Un **CVE** (*Common Vulnerabilities and Exposures*) es un identificador público y único para una vulnerabilidad concreta en un producto concreto, con formato `CVE-AÑO-NÚMERO` (por ejemplo `CVE-2021-44228`). Un CVE **no** es una puntuación ni un parche; es un nombre común para que todos hablen de lo mismo.

## CWE – la clase de debilidad

**CWE** (*Common Weakness Enumeration*) es una lista comunitaria de debilidades de software y hardware: la *causa raíz* genérica (por ejemplo "inyección SQL", "desbordamiento de búfer"). Muchos CVE distintos comparten el mismo CWE. Sirve para desarrolladores: eliminar una clase de error evita muchos CVE futuros. MITRE publica además el *CWE Top 25* anual.

## CVSS – severidad técnica

**CVSS v4.0** (FIRST, publicado el 1-nov-2023) tiene cuatro grupos de métricas:

- **Base**: características intrínsecas. Exploitabilidad: *Attack Vector* (Network/Adjacent/Local/Physical), *Attack Complexity*, *Attack Requirements*, *Privileges Required*, *User Interaction*. Impacto sobre el sistema vulnerable (VC/VI/VA) y sobre sistemas subsiguientes (SC/SI/SA).
- **Threat**: ajusta por madurez de explotación (sustituye al "Temporal" de v3.1).
- **Environmental**: ajusta a tu entorno y controles compensatorios.
- **Supplemental**: contexto adicional que **no** cambia la puntuación (p. ej. *Automatable*, *Safety*).

Escala cualitativa: None 0.0 · Low 0.1–3.9 · Medium 4.0–6.9 · High 7.0–8.9 · Critical 9.0–10.0.
Nomenclatura: **CVSS-B** (solo Base), **CVSS-BT**, **CVSS-BE**, **CVSS-BTE**. Una puntuación "9.8" sin indicar versión ni grupos es información incompleta. CVSS v3.1 sigue apareciendo ampliamente en bases de datos antiguas.

> CVSS mide **severidad**, no **riesgo**.

## EPSS – probabilidad de explotación

**EPSS** (*Exploit Prediction Scoring System*, FIRST) es un modelo de aprendizaje automático que estima la probabilidad de que un CVE sea explotado *in the wild* en los próximos 30 días. Publica diariamente un score de 0 a 1 y un percentil por CVE; los datos son gratuitos (CSV, API). Sirve para enfocar recursos limitados, **no** para decidir solo.

## KEV – explotación confirmada

El **catálogo KEV** (*Known Exploited Vulnerabilities*, CISA) es la lista de vulnerabilidades con explotación activa confirmada. CISA indica que debe usarse como **entrada** de un marco de priorización. Cada entrada incluye CVE, fecha de inclusión, fecha límite y si se sabe que se usa en campañas de ransomware.

**Dato actual:** en junio de 2026 CISA publicó la **BOD 26-04** (*Prioritizing Security Updates Based on Risk*), que según la cobertura secundaria sustituye a las BOD 19-02 y 22-01 y reemplaza la prioridad "solo por severidad" por un modelo de riesgo con ventanas de remediación de 3, 14 o 60 días (o diferir). Aplica a agencias federales de EE. UU., pero es una buena referencia. *(Detalles exactos pendientes de verificar con el texto oficial; ver fuentes.)*

## Cómo se combinan (priorización)

1. ¿Está en **KEV**? → prioridad máxima si el activo es relevante y está expuesto.
2. **EPSS** alto → probable explotación inminente.
3. **CVSS** (idealmente BTE con tu entorno) → impacto técnico.
4. **Contexto**: exposición a Internet, valor del activo, controles compensatorios.

## Errores comunes

- Parchear por orden de CVSS-B ignorando exposición y explotación real.
- Confundir CVE (instancia) con CWE (clase).
- Citar "CVSS 9.8" sin versión ni vector.
- Tratar EPSS como certeza: es una probabilidad, no una predicción individual.
- Pensar que "no está en KEV" significa "no se explota".

## Para practicar

Busca en NVD un CVE reciente. Anota: su CWE, vector CVSS (¿v3.1 o v4.0?), su EPSS (first.org/epss) y si está en KEV. Decide en qué orden lo parchearías respecto a otro CVE de distinto perfil y justifícalo.

## Referencias

- [FIRST – CVSS v4.0 Specification](https://www.first.org/cvss/specification-document)
- [FIRST – EPSS](https://www.first.org/epss/)
- [CISA – KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
- [MITRE – CWE](https://cwe.mitre.org/about/index.html)
