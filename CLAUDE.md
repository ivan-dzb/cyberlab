# CyberLab – Plataforma educativa de ciberseguridad

Plataforma web pública y gratuita para aprender pentesting y hacking ético mediante retos prácticos (apps deliberadamente vulnerables) con dificultad progresiva: **Principiante → Intermedio → Avanzado → Experto**. Incluye un catálogo de herramientas de Kali y aislamiento por contenedor Docker por sesión de usuario.

> Estado: **Fases 1 y 2 completadas** (esqueleto + aislamiento; sistema de juego y 6 retos principiante). Siguiente: Fase 3, catálogo de herramientas. Ver `docs/architecture.md` y `docs/user-stories.md`.

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
challenges/          Un reto por carpeta, aislado (ver challenges/README.md); _canary = pruebas de aislamiento
orchestrator/        Servicio que crea/destruye contenedores de reto (único con acceso a Docker)
gateway/             Proxy que sirve cada reto desde su propio origen
content/legal/       Términos de uso (es/en)
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
4. Todo reto nuevo vive en su propia carpeta bajo `challenges/` y debe funcionar con las restricciones que impone el orquestador: usuario `nobody`, FS raíz de solo lectura (solo `/tmp`), sin capabilities, sin red saliente, límites de CPU/memoria/pids. Nunca montar `docker.sock` ni usar `--privileged`.
5. Todo reto nuevo debe pasar por el agente `security-reviewer` antes de integrarse.
6. Rate limiting en login y creación de sesiones de contenedor.
7. Solo datos mínimos de usuario (correo/usuario). Nunca pedir datos personales reales.
8. Las vulnerabilidades deliberadas viven **solo** dentro de los contenedores de reto; el código de la plataforma (`src/`) debe ser seguro.
9. La app web nunca habla con Docker: solo con el orquestador. Los retos se sirven desde su propio origen (`<sid>.lab.*`), nunca desde el origen de la plataforma.
10. Cualquier cambio en `orchestrator/`, `gateway/` o `docker-compose.yml` exige correr `npm run test:isolation`.
11. Todo reto nuevo debe traer `solve.mjs` y pasar `npm run test:challenges`; la bandera nunca va hardcodeada (variable `FLAG`).

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
docker compose up -d --build            # app, db, orchestrator, gateway, dockerproxy
docker compose exec app npm run migrate
npm run build:challenges                # (host) construye las imágenes de retos
docker compose exec app npm run sync:challenges
docker compose exec app npm run test:isolation   # pruebas de aislamiento
docker compose exec app npm run test:challenges  # cada reto es resoluble (solve.mjs)
npm run typecheck
npm test                                # unitarias (Vitest); `npm run test:coverage`
npm run test:e2e                        # Playwright contra la pila levantada (ver docs/testing.md)
```

Si cambian las dependencias: `docker compose up -d --build -V app` (renueva el volumen de node_modules).
