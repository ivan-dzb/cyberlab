# Retos

Cada reto vive en `challenges/<slug>/`, aislado de los demás y de la plataforma.

```
challenges/<slug>/
  challenge.json   metadata (slug, titulo, nivel, xp, herramientas, imagen_docker, limites)
  teoria.md        teoría del reto
  Dockerfile       imagen del reto (usuario no-root, base fijada)
  app/             aplicación deliberadamente vulnerable
```

Usa `challenges/_template/` como base y la skill `add-challenge` para crear uno. Reglas en `CLAUDE.md`.
Los retos nunca tienen red hacia el host ni hacia otros contenedores.
