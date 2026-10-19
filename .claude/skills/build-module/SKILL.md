---
name: build-module
description: Construye un módulo de aprendizaje (M##) del roadmap: investiga a fondo las mejores prácticas actuales, condensa la teoría y crea labs, retos y evaluación.
---

# build-module

Entrada: ID de módulo del `docs/roadmap-aprendizaje.md` (ej. `M16`).

1. **Alcance** – lee la entrada del módulo en el roadmap, sus prerrequisitos y nivel. Confirma con el usuario si el alcance debe ampliarse o recortarse.
2. **Investigación** – busca en la web fuentes primarias y recientes (estándares oficiales, documentación, investigación de referencia, informes anuales, CVEs/KEV recientes, charlas, papers). Contrasta al menos 2 fuentes por afirmación técnica relevante. Guarda `content/modules/<id>-<slug>/fuentes.md` (título, URL, fecha de consulta, qué aporta).
3. **Teoría (bilingüe)** – escribe cada lección en ambos idiomas: `content/modules/<id>-<slug>/leccion-NN-<tema>.es.md` y `.en.md` (mismo frontmatter y estructura; los títulos/descripciones de BD llevan `es` y `en`). Por lección con estructura: Resumen (5 min) → Concepto → Cómo funciona → Cómo se ataca (solo en laboratorio) → Cómo se defiende → Errores comunes → Referencias. Frontmatter: `titulo`, `nivel`, `prerrequisitos`, `tiempo_min`, `ultima_revision`, `mapeo` (ATT&CK/OWASP/NIST).
4. **Práctica** – mínimo 2 labs guiados y 3 retos de dificultad creciente; cada reto con la skill `add-challenge` (incluye `security-reviewer`).
5. **Evaluación** – `quiz.json` con preguntas, respuesta correcta y explicación; reto final.
6. **Herramientas** – registra nuevas herramientas con `add-tool`.
7. **Migración/registro** – agente `db-migration` para registrar módulo, lecciones y relaciones.
8. **Revisión** – exactitud técnica, ética (todo contra objetivos de laboratorio propios; nada operativo contra terceros), enlaces vigentes.

Criterio de terminado: módulo visible en la plataforma, fuentes documentadas, labs/retos aprobados por `security-reviewer`, `ultima_revision` establecida.
