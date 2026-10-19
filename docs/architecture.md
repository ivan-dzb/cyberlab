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

## Aislamiento por contenedor (implementado en Fase 1)

```
Navegador ──► Next.js (web, :3000) ──► orchestrator (:4000, red orch) ──► dockerproxy ──► Docker
    │                                        │ crea red + contenedor por sesión
    │                                        └─► gateway admin (:8082, red gwctl, solo desde el orquestador)
    └──► gateway público (:8081)  <sid>.lab.<dominio> ──► contenedor del reto (red cyberlab-s-<sid>, internal)
```

**Servicios y redes** (`docker-compose.yml`):

| Servicio | Redes | Rol |
|---|---|---|
| `app` | default, orch | UI + API. **No** tiene acceso a Docker ni al admin del gateway |
| `orchestrator` | orch, gwctl, dockerctl | Único que habla con Docker (vía `dockerproxy`). Es el punto de política |
| `dockerproxy` | dockerctl | Socket proxy (solo contenedores y redes) |
| `gateway` | default, gwctl | Sirve cada reto desde su propio origen; API admin protegida por token **y** por IP del orquestador |
| `db` | default | Postgres |

Las redes `orch`, `gwctl` y `dockerctl` son `internal` (sin Internet).

**Política que aplica el orquestador a cada contenedor de reto** (ignora cualquier opción equivalente en la petición):
imagen solo `cyberlab/*`; usuario `65534` (nobody); FS raíz de solo lectura + `/tmp` tmpfs `noexec`; `cap_drop ALL`; `no-new-privileges`; límites de memoria (sin swap), CPU y pids; `nofile` 256; sin puertos publicados; **red propia `internal`** por sesión (sin Internet, sin host, sin otras sesiones).

**Ciclo de vida de una sesión**
1. `POST /api/sessions` (auth, rate limit 10/h, una sesión activa por usuario por índice único parcial). Se genera una bandera por sesión (solo se guarda su hash SHA-256).
2. El orquestador crea red + contenedor, conecta el gateway a esa red y registra la ruta.
3. El usuario abre `http://<sid>.lab.localhost:8081`. El **id de sesión (UUID v4) es la capacidad de acceso**: no es adivinable. Cada reto vive en un origen distinto al de la plataforma, por lo que un XSS en un reto no puede tocar cookies ni la API de la web.
4. Inactividad: el gateway cuenta peticiones; el *reaper* (en la app, con advisory lock de Postgres) extiende `expira_en` por actividad real (tope absoluto de 2 h), expira y destruye sesiones vencidas, cierra arranques atascados y destruye contenedores huérfanos.
5. Eventos en `session_event` (inicio, extensión, fin, expiración, error, tráfico alto, huérfana).

**Limitaciones conocidas de la Fase 1**
- Reiniciar el gateway olvida las rutas: las sesiones activas quedan inaccesibles hasta que expiran.
- El gateway no soporta WebSockets.
- Con `CONTAINERS=1` el socket proxy aún permite `exec` y `create` con opciones arbitrarias; por eso solo el orquestador (que valida) está en `dockerctl`. Para producción conviene endurecer más (p. ej. runtime gVisor/Kata, rootless Docker, o un host dedicado a retos).
- La IP del cliente para rate limiting sale de `X-Forwarded-For`: en producción el proxy de entrada debe sobrescribirlo.
- Los términos de uso son un borrador y requieren revisión legal antes del lanzamiento público.

**Pruebas**: `npm run test:isolation` (19 comprobaciones desde dentro de un contenedor canario `_canary`) corre en CI y falla si se rompe el aislamiento.

## Sistema de juego (Fase 2)

- **Bandera por sesión**: el orquestador inyecta `FLAG` (aleatoria) al contenedor; la BD solo guarda su SHA-256 (`container_session.flag_hash`). `POST /api/challenges/:slug/flag` compara en tiempo constante contra la sesión **activa del propio usuario**, con rate limit (20 por 10 min).
- **XP y niveles** (`src/lib/xp.ts`): cada reto vale su `xp`; cada pista usada resta un 20 % (mínimo 40 %). Niveles por umbrales de XP acumulado. Se otorga una sola vez por reto.
- **Pistas**: `pistas.{es,en}.md` (separadas por `---`, máximo 5) sincronizadas a Postgres. El servidor solo devuelve el texto de las ya desbloqueadas; desbloquear es atómico y no se permite tras completar.
- **Writeup oficial**: `writeup.{es,en}.md`; se entrega solo a quien completó el reto (comprobación en servidor, no viaja en el catálogo).
- **Perfil**: `/profile` con nivel, XP, retos y lecciones completados; el encabezado muestra nivel y XP.
- **Calidad de retos**: cada reto trae `solve.mjs`; `npm run test:challenges` inicia una sesión real con una bandera conocida, ejecuta la solución y comprueba que obtiene exactamente esa bandera (corre en CI). Un reto sin `solve.mjs` falla.

## Autenticación y límites

- Registro/login con correo + contraseña; `scrypt` (N=2^17, r=8, p=1) con sal; sesión = token aleatorio en cookie `httpOnly` + `SameSite=Lax` (+`Secure` en producción), solo se guarda su hash.
- Login: respuesta idéntica para correo inexistente y contraseña errónea, con verificación de hash ficticio (sin diferencia de tiempo).
- Endpoints que cambian estado exigen `Content-Type: application/json` y `Origin` coincidente (defensa CSRF adicional).
- Rate limiting de ventana fija en Postgres (`rate_limit`): login por IP (30/15 min) y por cuenta (5/15 min), registro por IP (5/h), sesiones de reto por usuario (10/h), progreso por usuario (120/min). Límite por cuenta implica que un atacante puede bloquear temporalmente un login ajeno (trade-off asumido).
- Términos de uso: aceptación obligatoria al registrarse; se guarda versión y fecha.

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
- **Progreso**: tabla `lesson_progress(user_id, module_slug, lesson_slug)` vía `/api/progress` (claves validadas contra el contenido). Sin sesión se usa `localStorage` y se importa una vez al iniciar sesión. La BD solo guarda estado del usuario, no contenido.
- Entidades futuras en BD: `lesson_progress`, `quiz_attempt`, y la relación módulo↔reto por slug (`challenge.slug`).

## Fases (resumen)

1. Esqueleto + aislamiento: estructura, auth, rate limiting, términos, progreso, catálogo de retos, orquestador, gateway, reaper, pruebas de aislamiento. **Completada** (ver `docs/user-stories.md`).
2. Orquestador de contenedores y primer reto de prueba.
2. Retos principiante: sistema de juego (banderas, XP, pistas, writeups), test de resolubilidad y 6 retos. **Completada** (ver `docs/user-stories.md`).
3+. Catálogo de herramientas, retos intermedio/avanzado, terminal sandbox, pulido.

## Registro de decisiones

- **2026-10-18** – Next.js App Router + Postgres + SQL plano; migraciones numeradas con runner propio (`scripts/migrate.mjs`).
- **2026-10-18** – Auth propia pospuesta hasta revisar la estructura; el esquema ya incluye `password_hash`.
- **2026-10-19** – Fase 2: bandera por sesión con hash, XP con penalización por pistas, writeup servido solo tras completar, `solve.mjs` obligatorio por reto verificado en CI.
- **2026-10-19** – Fase 1: scrypt nativo (sin dependencias nativas), rate limiting en Postgres, orquestador + gateway separados con redes segmentadas, un origen por sesión de reto, reaper en la app con advisory lock.
