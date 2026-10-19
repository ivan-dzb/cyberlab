# Retos

Cada reto vive en `challenges/<slug>/`, aislado de los demás y de la plataforma.

```
challenges/<slug>/
  challenge.json     slug, titulo{es,en}, descripcion{es,en}, nivel, xp, herramientas[], imagen_docker, puerto, limites
  teoria.es.md       teoría (obligatoria)   teoria.en.md  (recomendada; si falta se muestra la de es)
  Dockerfile         imagen del reto (base fijada; el orquestador fuerza usuario nobody)
  app/               aplicación deliberadamente vulnerable
```

- Plantilla: `challenges/_template/`. Proceso completo: skill `add-challenge`.
- Slugs con prefijo `_` se sincronizan pero no se listan (p. ej. `_canary`).
- La imagen debe llamarse `cyberlab/<nombre>:<tag>` (el orquestador rechaza otras).
- El contenedor corre con FS de solo lectura (escribe solo en `/tmp`), sin red saliente, sin capabilities y como `nobody`. La bandera llega por la variable de entorno `FLAG`, distinta en cada sesión.
- Construir y registrar: `npm run build:challenges` (host) y `docker compose exec app npm run sync:challenges`.
