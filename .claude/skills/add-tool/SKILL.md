---
name: add-tool
description: Proceso para agregar una herramienta nueva al catálogo de Kali (tabla tool).
---

# add-tool

Entrada: nombre de la herramienta, categoría, descripción corta, comandos de ejemplo.

1. Define `slug` (kebab-case, ej. `nmap`) y verifica que no exista en migraciones previas (`grep -ri "'<slug>'" db/migrations`).
2. Categoría: una de `reconocimiento`, `escaneo`, `explotacion`, `contrasenas`, `web`, `redes`, `forense`, `otros` (si falta una, créala en la migración con su `CHECK`).
3. Descripción: 1–3 frases en español, enfocadas en para qué sirve y cuándo usarla.
4. `comandos_ejemplo`: 2–5 ejemplos, **solo contra objetivos de laboratorio** (ej. la IP del contenedor del reto), con una explicación breve de cada flag.
5. Invoca el agente `db-migration` para crear `db/migrations/NNNN_tool_<slug>.sql` con `INSERT INTO tool (...) ON CONFLICT (slug) DO NOTHING`.
6. Ejecuta `npm run migrate`.
7. Si la herramienta aplica a retos existentes, añade filas en `challenge_tool`.

Criterio de terminado: la herramienta aparece en el catálogo y su migración está aplicada.
