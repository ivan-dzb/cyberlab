# CyberLab – Plataforma educativa de ciberseguridad

Plataforma web pública y gratuita para aprender pentesting y hacking ético mediante retos prácticos (apps deliberadamente vulnerables) con dificultad progresiva: **Principiante → Intermedio → Avanzado → Experto**. Incluye un catálogo de herramientas de Kali y aislamiento por contenedor Docker por sesión de usuario.

> Estado: **Fase 1 (esqueleto)**. No hay retos vulnerables reales ni autenticación completa todavía. Ver `docs/architecture.md`.

## Stack

- Next.js (App Router, TypeScript) – frontend + API routes
- PostgreSQL 16 – acceso con `pg` (SQL plano, migraciones en `db/migrations/`)
- Autenticación propia (pendiente; hash con argon2/bcrypt, sesiones en cookie httpOnly)
- Docker / Docker Compose – desarrollo local y aislamiento de retos

## Estructura de carpetas

```
.claude/agents/      Agentes: challenge-builder, security-reviewer, db-migration
.claude/skills/      Skills: add-challenge, add-tool
db/migrations/       Migraciones SQL numeradas (0001_*.sql, ...)
docs/architecture.md Decisiones de arquitectura (documento vivo)
challenges/          Un reto por carpeta, aislado (ver challenges/README.md)
scripts/             Utilidades (migrate.mjs)
src/app/             Rutas y páginas (App Router) y API routes
src/lib/             Código compartido (db, validación, etc.)
src/components/      Componentes React
```

## Convenciones de código

- TypeScript estricto; sin `any` salvo justificación en comentario.
- Nombres: archivos y carpetas `kebab-case`; componentes React `PascalCase`; funciones/variables `camelCase`; tablas y columnas SQL `snake_case` (en español donde el modelo ya lo define: `titulo`, `nivel`, `estado`).
- Componentes: server components por defecto; `"use client"` solo si hace falta. Un componente por archivo en `src/components/`.
- Errores: las API routes devuelven JSON `{ error: string }` con el código HTTP correcto; nunca filtrar stack traces ni mensajes de BD al cliente; registrar el detalle en el servidor.
- Acceso a BD solo vía `src/lib/db.ts` con consultas **parametrizadas** (`$1, $2`). Prohibido concatenar input en SQL.
- Migraciones: nunca editar una migración ya aplicada; crear una nueva.

## Reglas de seguridad no negociables

1. **Ningún reto puede tener acceso de red al host ni a otros contenedores.** Cada sesión corre en una red Docker aislada (`internal: true`), sin puertos publicados al host salvo el proxy del orquestador.
2. **Nunca commitear secretos.** Usar `.env` (ignorado por git) y mantener `.env.example` solo con valores de ejemplo.
3. **Todo input de usuario se valida en el backend**, aunque el frontend también valide.
4. Todo reto nuevo vive en su propia carpeta bajo `challenges/`, con límites de CPU/memoria, usuario no-root, FS de solo lectura cuando sea posible y sin capabilities extra (`cap_drop: ALL`, sin `--privileged`, sin montar `docker.sock`).
5. Todo reto nuevo debe pasar por el agente `security-reviewer` antes de integrarse.
6. Rate limiting en login y creación de sesiones de contenedor.
7. Solo datos mínimos de usuario (correo/usuario). Nunca pedir datos personales reales.
8. Las vulnerabilidades deliberadas viven **solo** dentro de los contenedores de reto; el código de la plataforma (`src/`) debe ser seguro.

## Idiomas y tema

La plataforma es bilingüe (es/en) y tiene modo claro/oscuro. Reglas: texto de UI solo vía `messages/{es,en}.json` (mismas claves en ambos); contenido largo en `*.es.md` + `*.en.md`; textos de BD en `jsonb {es,en}`; colores solo con variables CSS de `globals.css` (nunca hex sueltos en componentes). Detalle en `docs/architecture.md`.

## Diseño

Identidad "expediente + mapa de sectores" (ver `docs/architecture.md`, sección Identidad visual). Reutiliza las clases de `globals.css` (`.panel`, `.label`, `.clearance`, `.btn`, `.redact`) antes de crear estilos nuevos. Sin pixel-art, sin verde de terminal, sin hex sueltos.

## Contenido educativo

La plataforma es **aprendizaje + retos**. El plan de contenido está en `docs/roadmap-aprendizaje.md` (módulos M01–M52). Los módulos se construyen uno a uno con la skill `build-module`: investigar fuentes primarias actuales, condensar teoría en `content/modules/<id>-<slug>/`, y añadir labs/retos/quiz. Todo contenido ofensivo se enseña contra objetivos de laboratorio propios.

## Flujo de trabajo

- Nuevo módulo de aprendizaje: skill `build-module`.

- Nuevo reto: skill `add-challenge` (usa el agente `challenge-builder`, luego `security-reviewer`).
- Nueva herramienta de Kali: skill `add-tool`.
- Cambio de esquema: agente `db-migration`.
- Documentar decisiones relevantes en `docs/architecture.md`.

## Comandos

```bash
docker compose up --build   # app + postgres
npm run dev                 # solo app (requiere DATABASE_URL)
npm run migrate             # aplica db/migrations/*.sql
npm run typecheck
```
