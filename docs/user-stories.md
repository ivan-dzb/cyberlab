# Backlog – Fase 1: Esqueleto + aislamiento

Fuente: plan de desarrollo (Fase 1, oct–nov 2026). Cada historia se entrega en su propio commit (`US-XX: ...`).

| ID | Historia | Criterios de aceptación | Estado |
|---|---|---|---|
| US-01 | Como visitante quiero crear una cuenta e iniciar sesión para guardar mi progreso | Registro con correo + contraseña (mín. 10 caracteres); hash `scrypt`; sesión en cookie httpOnly/SameSite; logout invalida la sesión; validación en backend; mensajes de error sin revelar si el correo existe | ✅ |
| US-02 | Como operador quiero limitar peticiones en login, registro y creación de sesiones para frenar abuso | Límite por IP y por cuenta en ventana fija; HTTP 429 con `Retry-After`; contadores en Postgres | ✅ |
| US-03 | Como usuario quiero ver y aceptar términos de uso claros | Página `/terms` es/en; el registro exige aceptación y guarda la fecha; solo se pide correo y contraseña | ☐ |
| US-04 | Como usuario quiero que mi progreso de lecciones se guarde en mi cuenta | Tabla `lesson_progress`; API para marcar/desmarcar; migra el progreso de localStorage al iniciar sesión | ☐ |
| US-05 | Como usuario quiero ver el catálogo de retos | `challenge.json` por carpeta sincroniza a BD; páginas `/challenges` y detalle; retos con prefijo `_` no se listan | ☐ |
| US-06 | Como usuario quiero iniciar un reto en un entorno propio y aislado | Orquestador separado crea un contenedor por sesión en una red `internal`, con límites de CPU/memoria/pids, `cap_drop ALL`, usuario no-root, FS solo lectura; la app web nunca toca el socket de Docker; registro en `container_session` | ☐ |
| US-07 | Como usuario quiero abrir mi reto desde el navegador | Gateway enruta `/play/<sesión>` solo al contenedor de ese usuario; pantalla con tiempo restante, botón de terminar y extender | ☐ |
| US-08 | Como operador quiero logs por sesión y limpieza automática | Tabla `session_event`; reaper destruye sesiones vencidas y reconcilia con Docker; timeout por inactividad | ☐ |
| US-09 | Como operador quiero pruebas que demuestren el aislamiento | Reto canario `_canary`; script que verifica: sin Internet, sin acceso al host, a la BD, al orquestador ni a otras sesiones; falla el CI si se rompe | ☐ |

## Fuera de alcance de la Fase 1
Retos con vulnerabilidades reales (Fase 2), catálogo de herramientas poblado (Fase 3), terminal sandbox (Fase 5).
