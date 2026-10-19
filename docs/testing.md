# Pruebas

Tres capas, de la más rápida a la más realista.

| Capa | Herramienta | Comando | Qué cubre |
|---|---|---|---|
| Unitarias y de integración ligera | Vitest + Testing Library | `npm test` | libs, rutas API, componentes, páginas, integridad del contenido y servicios Node |
| Aislamiento y retos | Scripts contra la pila real | `docker compose exec app npm run test:isolation` · `npm run test:challenges` | el contenedor de reto está aislado; cada reto es resoluble |
| End-to-end | Playwright (Chromium) | `npm run test:e2e` | flujos de usuario completos, seguridad, accesibilidad y responsive |

## Unitarias (`npm test`)

- Configuración: `vitest.config.mts`. `server-only` se sustituye por un módulo vacío; los tests de componentes usan `// @vitest-environment jsdom`.
- Las rutas y librerías con base de datos se prueban con mocks (`vi.hoisted` + `vi.mock("@/lib/db")`); el SQL se verifica por su texto y parámetros.
- Los componentes se renderizan con los **mensajes reales** (`messages/es.json` y `en.json`) mediante `tests/dom.tsx`; los de servidor asíncronos se invocan como funciones y se renderizan.
- `tests/unit/` contiene pruebas de integridad: paridad de claves es/en, módulos, retos (esquema, pistas, writeups, sin secretos ni banderas incrustadas), migraciones y matcher del middleware.
- El orquestador y el gateway se prueban como **procesos reales** (`tests/proc.ts`) contra servidores falsos de Docker y del gateway: se comprueba la política de endurecimiento, la validación y el borrado.
- Cobertura: `npm run test:coverage` (≈99 % de `src/`).

## End-to-end (`npm run test:e2e`)

Requiere la pila levantada:

```bash
npm run build:challenges
docker compose up -d --build
docker compose exec app npm run migrate
docker compose exec app npm run sync:challenges
npx playwright install chromium      # una vez
npm run test:e2e                     # o: npx playwright test security
```

- Se ejecutan **en serie** (comparten BD y cada usuario solo puede tener una sesión de reto activa) y cada test crea su propio usuario.
- Cada test envía un `X-Forwarded-For` distinto para no agotar el rate limiting por IP.
- Tras cada test se termina la sesión de reto que haya quedado activa.
- `e2e/fixtures.ts` expone `psql()` y `dockerCompose()` para inspeccionar estado o provocar escenarios (por ejemplo, reiniciar el gateway para probar la expiración).
- Specs: `smoke`, `i18n-theme`, `auth`, `modules`, `challenges`, `solve-challenges` (los 7 retos resueltos desde el navegador), `security` (origen aislado, CSRF, aislamiento entre usuarios, puertos internos cerrados) y `a11y-responsive` (axe WCAG 2.1 A/AA en ambos temas, móvil y tablet).

## CI

`.github/workflows/ci.yml`: el job `unit` corre tipos y Vitest con cobertura; el job `integration` levanta la pila y corre aislamiento, resolubilidad de retos y Playwright (sube el informe si falla).

## Errores que encontraron estas pruebas

- El botón de «lección completada» se podía pulsar antes de cargar el estado y el cambio se perdía o se revertía → deshabilitado hasta cargar.
- Los formularios de acceso podían enviarse de forma nativa antes de hidratar (GET con la contraseña en la URL) → `method="post"` y botón deshabilitado hasta hidratar.
- Tras completar un reto, el XP del encabezado y el writeup no se actualizaban hasta recargar → `router.refresh()`.
- El mapa de módulos usaba `role="img"` con enlaces dentro (axe: `nested-interactive`) → `role="group"`.
- En móvil el encabezado desbordaba 50 px → pasa a dos filas.
- El titular de la home no tenía espacio antes del `<br>` → se leía «ciberseguridadde».
