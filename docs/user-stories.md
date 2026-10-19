# Backlog de historias de usuario

Cada historia se entrega en su propio commit (`US-XX: ...`).

## Fase 1: Esqueleto + aislamiento ✅

Fuente: plan de desarrollo (Fase 1, oct–nov 2026).

| ID | Historia | Criterios de aceptación | Estado |
|---|---|---|---|
| US-01 | Como visitante quiero crear una cuenta e iniciar sesión para guardar mi progreso | Registro con correo + contraseña (mín. 10 caracteres); hash `scrypt`; sesión en cookie httpOnly/SameSite; logout invalida la sesión; validación en backend; mensajes de error sin revelar si el correo existe | ✅ |
| US-02 | Como operador quiero limitar peticiones en login, registro y creación de sesiones para frenar abuso | Límite por IP y por cuenta en ventana fija; HTTP 429 con `Retry-After`; contadores en Postgres | ✅ |
| US-03 | Como usuario quiero ver y aceptar términos de uso claros | Página `/terms` es/en; el registro exige aceptación y guarda la fecha; solo se pide correo y contraseña | ✅ |
| US-04 | Como usuario quiero que mi progreso de lecciones se guarde en mi cuenta | Tabla `lesson_progress`; API para marcar/desmarcar; migra el progreso de localStorage al iniciar sesión | ✅ |
| US-05 | Como usuario quiero ver el catálogo de retos | `challenge.json` por carpeta sincroniza a BD; páginas `/challenges` y detalle; retos con prefijo `_` no se listan | ✅ |
| US-06 | Como usuario quiero iniciar un reto en un entorno propio y aislado | Orquestador separado crea un contenedor por sesión en una red `internal`, con límites, `cap_drop ALL`, usuario no-root, FS solo lectura; la app web nunca toca el socket de Docker; registro en `container_session` | ✅ |
| US-07 | Como usuario quiero abrir mi reto desde el navegador | Gateway con origen propio por sesión; pantalla con tiempo restante, terminar y extender | ✅ |
| US-08 | Como operador quiero logs por sesión y limpieza automática | Tabla `session_event`; reaper destruye sesiones vencidas y reconcilia con Docker | ✅ |
| US-09 | Como operador quiero pruebas que demuestren el aislamiento | Reto canario `_canary`; script que verifica el aislamiento; falla el CI si se rompe | ✅ |

## Fase 2: Retos de nivel principiante

Fuente: plan de desarrollo (Fase 2, nov 2026). Primero el sistema de juego (banderas, XP, pistas, writeups) y una prueba automática de que cada reto es resoluble; después los retos.

| ID | Historia | Criterios de aceptación | Estado |
|---|---|---|---|
| US-10 | Como usuario quiero enviar la bandera de mi sesión y ganar XP | `POST /api/challenges/:slug/flag` compara contra el hash de la sesión activa (tiempo constante); marca el reto completado una sola vez; XP según pistas usadas; rate limit por usuario | ✅ |
| US-11 | Como usuario quiero ver mi perfil con XP, nivel y retos completados | Página `/profile`; nivel por umbrales de XP; lista de retos y lecciones completados; XP visible en el encabezado | ✅ |
| US-12 | Como usuario quiero pistas escalonadas si me atasco | Pistas por reto en es/en; se desbloquean una a una; cada pista reduce el XP (mínimo 40 %); estado guardado en BD | ✅ |
| US-13 | Como usuario quiero ver el writeup oficial después de completar un reto | `writeup.{es,en}.md` por reto; el servidor solo lo entrega a quien completó el reto (nunca va en el catálogo público) | ✅ |
| US-14 | Como mantenedor quiero comprobar automáticamente que cada reto es resoluble | `solve.mjs` por reto; `npm run test:challenges` inicia cada reto, lo resuelve y verifica que obtiene la bandera de esa sesión; corre en CI | ✅ |
| US-15 | Como estudiante quiero el reto **robots-secretas** (reconocimiento web) | Descubrir rutas ocultas vía `robots.txt`; teoría, 3 pistas, writeup y `solve.mjs` | ✅ |
| US-16 | Como estudiante quiero el reto **cookie-confiada** (control de acceso roto) | Manipular una cookie de rol no firmada | ✅ |
| US-17 | Como estudiante quiero el reto **idor-facturas** (IDOR) | Acceder a recursos ajenos cambiando un identificador | ✅ |
| US-18 | Como estudiante quiero el reto **login-ingenuo** (inyección SQL) | Evadir autenticación con SQLi sobre un motor SQL real (SQLite en memoria) | ✅ |
| US-19 | Como estudiante quiero el reto **pin-debil** (fuerza bruta) | PIN de 4 dígitos sin límite de intentos; enseña a automatizar peticiones | ✅ |
| US-20 | Como estudiante quiero el reto **visor-de-archivos** (path traversal) | Leer un archivo fuera del directorio permitido | ☐ |

## Fuera de alcance de la Fase 2
Catálogo de herramientas poblado (Fase 3), retos intermedio/avanzado (Fase 4), terminal sandbox (Fase 5), writeups escritos por usuarios.
