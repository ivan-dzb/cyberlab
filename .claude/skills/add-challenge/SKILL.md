---
name: add-challenge
description: Proceso exacto para agregar un reto nuevo al catálogo, desde la carpeta hasta que aparece visible en la plataforma.
---

# add-challenge

Entrada: tema, nivel (principiante|intermedio|avanzado|experto), herramientas de Kali relacionadas.

1. **Scaffolding** – invoca el agente `challenge-builder` con la entrada. Debe producir `challenges/<slug>/` con:
   - `challenge.json` (slug, titulo, nivel, xp, herramientas[], imagen_docker, recursos)
   - `teoria.md`
   - `Dockerfile` y `app/` (la app vulnerable)
2. **Herramientas** – por cada herramienta en `challenge.json`, confirma que existe en la tabla `tool`; si no, ejecuta la skill `add-tool` primero.
3. **Migración** – invoca el agente `db-migration` para crear `db/migrations/NNNN_reto_<slug>.sql` que inserte en `challenge` (con `teoria_md` leído de `teoria.md`) y en `challenge_tool`.
4. **Revisión de seguridad** – invoca el agente `security-reviewer` sobre `challenges/<slug>/`. Si el veredicto es RECHAZADO, corrige y vuelve a revisar. No continuar sin APROBADO.
5. **Build local** – `docker build -t cyberlab/<slug>:latest challenges/<slug>/` y prueba el contenedor en una red `--internal`:
   ```bash
   docker network create --internal test-<slug>
   docker run --rm --network test-<slug> --cap-drop ALL --memory 256m --cpus 0.5 --pids-limit 100 cyberlab/<slug>:latest
   ```
6. **Aplicar migración** – `npm run migrate`.
7. **Verificar visibilidad** – el reto aparece en el catálogo de la plataforma con su nivel y teoría (cuando exista la UI de catálogo, abrir `/retos/<slug>`).
8. **Documentar** – añade una línea en `docs/architecture.md` solo si el reto introduce un patrón nuevo.

Criterio de terminado: carpeta creada, revisión APROBADA, migración aplicada, reto visible.
