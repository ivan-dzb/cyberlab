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

## Identidad visual

Concepto: **expediente + mapa de sectores**. El usuario opera sobre archivos de caso y sube por niveles de acreditación; no se usa pixel-art ni terminal verde.

- **Tipografía** (next/font): Instrument Serif (display/titulares, cursiva para el énfasis), Geist (cuerpo), Geist Mono (etiquetas técnicas, números de módulo, navegación).
- **Color**: tinta casi negra + hueso (oscuro) / papel de expediente (claro); acento bermellón. Un color por nivel: principiante (azul hielo), intermedio (ámbar), avanzado (bermellón), experto (violeta). Siempre vía variables CSS.
- **Motivos**: retícula de coordenadas de fondo, marcas de registro en las esquinas de los paneles (`.panel`), barras de censura que se revelan al pasar el cursor (`.redact`), numerales de módulo en contorno, medidor segmentado de acreditación (`Clearance`), botones con esquina cortada.
- **Pieza firma**: el *mapa de sectores* (`SectorMap`), un SVG con una columna por etapa y un nodo por módulo; los publicados se iluminan y enlazan. La estructura sale de `src/lib/roadmap.ts`.
- Accesibilidad: foco visible, `prefers-reduced-motion`, contraste revisado en ambos temas (pendiente auditoría formal).

## Contenido de aprendizaje (módulos)

El contenido sigue `docs/roadmap-aprendizaje.md`. Los módulos y lecciones se guardan como Markdown con frontmatter en `content/modules/<id>-<slug>/` (versionado en git, revisable) y se registran en BD para progreso y relaciones. **Decisión (Sprint 0):** el contenido NO se duplica en BD. `content/modules/<slug>/` es la fuente de verdad:

```
content/modules/m08-conceptos-seguridad/
  module.json                 id, slug, titulo{es,en}, descripcion{es,en}, nivel, etapa, prerrequisitos, tiempo_min, ultima_revision, lecciones[] (orden)
  01-triada-cia.es.md/.en.md  frontmatter: titulo, tiempo_min, ultima_revision
  fuentes.md                  fuentes consultadas (verificadas vs. secundarias vs. pendientes)
```

- `src/lib/content.ts` (solo servidor) lee los archivos; los slugs de la URL se validan contra `module.json` (allowlist), nunca se concatenan a rutas del disco.
- Markdown se renderiza con `react-markdown` (sin HTML crudo) + `remark-gfm` + `rehype-slug`.
- Rutas: `/[locale]/modules`, `/[locale]/modules/[module]`, `/[locale]/modules/[module]/[lesson]`.
- `next.config.mjs` incluye `content/**` en el build standalone (`outputFileTracingIncludes`).
- **Progreso**: provisional en `localStorage` (clave `cyberlab:progress`, `"<modulo>/<leccion>": true`). Al implementar auth pasará a una tabla `lesson_progress(user_id, module_slug, lesson_slug, completado_en)`; la BD solo guardará estado del usuario, no contenido.
- Entidades futuras en BD: `lesson_progress`, `quiz_attempt`, y la relación módulo↔reto por slug (`challenge.slug`).

## Fases (resumen)

1. Esqueleto: estructura, auth, aislamiento base, estructura de retos.
2. Orquestador de contenedores y primer reto de prueba.
3+. Contenido (retos por nivel), catálogo de herramientas, writeups, progreso/XP.

## Registro de decisiones

- **2026-10-18** – Next.js App Router + Postgres + SQL plano; migraciones numeradas con runner propio (`scripts/migrate.mjs`).
- **2026-10-18** – Auth propia pospuesta hasta revisar la estructura; el esquema ya incluye `password_hash`.
