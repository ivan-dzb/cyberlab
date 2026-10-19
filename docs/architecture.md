# Arquitectura

Documento vivo. Añadir una entrada en "Registro de decisiones" cuando cambie algo relevante.

## Visión general

```
Usuario ──► Next.js (UI + API routes) ──► Postgres
                    │
                    ▼
            Orquestador (módulo en la app, Fase 2)
                    │  Docker API
                    ▼
     ┌──────────────┴──────────────┐
     │ Contenedor reto (sesión A)  │  red aislada A (internal)
     │ Contenedor reto (sesión B)  │  red aislada B (internal)
     └─────────────────────────────┘
```

El orquestador levanta **un contenedor nuevo por cada sesión de usuario** que entra a un reto, sin red hacia el host ni hacia otros contenedores, y lo destruye tras un timeout de inactividad.

## Por qué Next.js + Postgres

- **Next.js**: un solo proyecto TypeScript para UI y API; menos piezas que mantener mientras el proyecto crece junto con el aprendizaje del autor. Server components simplifican páginas de contenido (teoría en Markdown, catálogo).
- **Postgres**: modelo claramente relacional (usuarios, retos, progreso, relación N:M retos↔herramientas), integridad con claves foráneas y constraints, y `CHECK`/enums para niveles y estados.
- **SQL plano con `pg`** en lugar de un ORM: esquema pequeño, migraciones explícitas y revisables, menos magia.

## Aislamiento por contenedor

Principios (se implementan desde la Fase 1 en la estructura; el orquestador completo llega en Fase 2):

- Un contenedor por sesión (`ContainerSession`), creado al iniciar y destruido por `expira_en` (30–60 min de inactividad).
- Red Docker **por sesión** con `internal: true`: sin salida a Internet, al host ni a otros contenedores. El acceso del usuario al reto pasa por un proxy inverso controlado por el orquestador que enruta solo a esa sesión.
- Límites: `mem_limit`, `cpus`, `pids_limit`; usuario no-root; `cap_drop: ALL`; `no-new-privileges`; FS de solo lectura cuando sea posible; nunca `privileged` ni montar `docker.sock`.
- El orquestador es el único componente con acceso a la Docker API; idealmente vía un socket proxy con permisos mínimos (no exponer el socket a la app web directamente).
- Rate limiting en login y creación de sesiones; logs de actividad por sesión para detectar abuso.
- Reaper periódico: destruye contenedores con `expira_en` vencido y reconcilia `ContainerSession` con el estado real de Docker.

## Modelo de datos

| Entidad | Campos clave | Relación |
|---|---|---|
| User | id, email, password_hash, created_at | tiene muchos UserProgress, Writeup |
| Challenge | id, titulo, nivel (principiante/intermedio/avanzado/experto), teoria_md, imagen_docker | tiene muchos UserProgress, ChallengeTool |
| UserProgress | user_id, challenge_id, estado, xp_otorgado, completado_en | une User y Challenge |
| Writeup | id, user_id, challenge_id, contenido, creado_en | pertenece a User y Challenge |
| Tool | id, nombre, categoria, descripcion, comandos_ejemplo | se relaciona con Challenge vía ChallengeTool |
| ChallengeTool | challenge_id, tool_id | tabla puente muchos-a-muchos |
| ContainerSession | id, user_id, challenge_id, container_id, iniciado_en, expira_en | rastrea contenedores activos para el orquestador |

Esquema SQL en `db/migrations/0001_initial_schema.sql`. Añadidos sobre el plan: `slug` en Challenge/Tool (URLs estables), `estado` de UserProgress acotado por `CHECK`, y `UNIQUE(user_id, challenge_id)` en progreso.

## Internacionalización (es/en) y tema

- **Rutas**: `next-intl` con prefijo de idioma (`/es/...`, `/en/...`), `es` por defecto; middleware detecta idioma. Config en `src/i18n/`.
- **Textos de UI**: `messages/es.json` y `messages/en.json`, mismas claves (namespaces por pantalla). Se usan con `useTranslations`. Nunca texto literal en componentes.
- **Contenido largo** (lecciones, teoría, writeups): un archivo por idioma, `leccion-01-xxx.es.md` / `leccion-01-xxx.en.md`, mismo frontmatter. Si falta la traducción, se muestra la de `es` con aviso.
- **Contenido en BD** (títulos, descripciones de reto/herramienta): columnas `jsonb` `{"es": ..., "en": ...}`; lectura con `COALESCE(col->>$locale, col->>'es')` (migración `0002`). `es` es obligatorio.
- **Tema claro/oscuro**: variables CSS en `src/app/globals.css`. Sin `data-theme` sigue `prefers-color-scheme`; el selector (Sistema/Claro/Oscuro) guarda una cookie `theme` que el layout lee en servidor para evitar parpadeo.
- Términos técnicos estándar (SQL injection, payload, exploit) se mantienen en inglés en ambos idiomas, con explicación en español la primera vez.

## Contenido de aprendizaje (módulos)

El contenido sigue `docs/roadmap-aprendizaje.md`. Los módulos y lecciones se guardan como Markdown con frontmatter en `content/modules/<id>-<slug>/` (versionado en git, revisable) y se registran en BD para progreso y relaciones. Entidades previstas (migración futura): `module` (id M##, slug, titulo, nivel, etapa, ultima_revision), `lesson` (module_id, orden, contenido), `module_prerequisite`, `module_challenge`, `quiz_attempt`. Pendiente de diseñar al empezar el Sprint 0 de módulos.

## Fases (resumen)

1. Esqueleto: estructura, auth, aislamiento base, estructura de retos.
2. Orquestador de contenedores y primer reto de prueba.
3+. Contenido (retos por nivel), catálogo de herramientas, writeups, progreso/XP.

## Registro de decisiones

- **2026-10-18** – Next.js App Router + Postgres + SQL plano; migraciones numeradas con runner propio (`scripts/migrate.mjs`).
- **2026-10-18** – Auth propia pospuesta hasta revisar la estructura; el esquema ya incluye `password_hash`.
