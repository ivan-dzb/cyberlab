---
name: add-challenge
description: Proceso exacto para agregar un reto nuevo al catálogo, desde la carpeta hasta que aparece visible y ejecutable en la plataforma.
---

# add-challenge

Entrada: tema, nivel (principiante|intermedio|avanzado|experto), herramientas de Kali relacionadas.

1. **Scaffolding** – invoca el agente `challenge-builder` con la entrada. Debe producir `challenges/<slug>/` copiando `challenges/_template/`:
   - `challenge.json` (slug, `titulo{es,en}`, `descripcion{es,en}`, nivel, xp, herramientas[], `imagen_docker` = `cyberlab/<slug>:latest`, puerto, limites)
   - `teoria.es.md` y `teoria.en.md` (sin H1: el título lo pone la página)
   - `Dockerfile` y `app/` (la app vulnerable)
2. **Compatibilidad con el orquestador** – el reto debe correr como `nobody`, con FS raíz de solo lectura (solo `/tmp`), sin red saliente y leyendo la bandera de la variable `FLAG` (nunca hardcodeada).
3. **Herramientas** – por cada herramienta en `challenge.json`, confirma que existe en la tabla `tool`; si no, ejecuta la skill `add-tool` primero (si no existe, `sync:challenges` avisa).
4. **Revisión de seguridad** – invoca el agente `security-reviewer` sobre `challenges/<slug>/`. Si el veredicto es RECHAZADO, corrige y vuelve a revisar. No continuar sin APROBADO.
5. **Build** – `npm run build:challenges <slug>` (en el host).
6. **Registro** – `docker compose exec app npm run sync:challenges` (valida el JSON con zod y hace upsert; no hay migración por reto).
7. **Prueba end-to-end** – inicia sesión en la plataforma, abre `/challenges/<slug>`, pulsa *Iniciar reto*, abre el reto, comprueba que se puede resolver y termina la sesión.
8. **Aislamiento** – `docker compose exec app npm run test:isolation` debe seguir en verde.
9. **Documentar** – añade una línea en `docs/architecture.md` solo si el reto introduce un patrón nuevo.

Criterio de terminado: carpeta creada, revisión APROBADA, imagen construida, reto sincronizado y resoluble desde la plataforma, pruebas de aislamiento en verde.
