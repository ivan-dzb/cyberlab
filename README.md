# CyberLab

Plataforma web pública y gratuita para aprender pentesting y hacking ético con lecciones y retos prácticos aislados en contenedores. **Estado: Fase 1 completada** (esqueleto + aislamiento). Backlog en [docs/user-stories.md](docs/user-stories.md).

Contexto del proyecto: [CLAUDE.md](CLAUDE.md) · Arquitectura: [docs/architecture.md](docs/architecture.md)

## Requisitos

- Docker Desktop (con Compose v2)
- Node.js 22+ (solo si corres fuera de Docker)

## Instalación

```bash
cp .env.example .env      # edita POSTGRES_PASSWORD y genera ORCH_TOKEN y GATEWAY_TOKEN (openssl rand -hex 32)
npm run build:challenges  # construye las imágenes de los retos (requiere Docker en el host)
docker compose up -d --build
```

En otra terminal, aplica el esquema:

```bash
docker compose exec app npm run migrate
docker compose exec app npm run sync:challenges
docker compose exec app npm run test:isolation   # verifica el aislamiento (19 comprobaciones)
```

Abre http://localhost:3000 y comprueba http://localhost:3000/api/health. Los retos se abren en `http://<sesión>.lab.localhost:8081` (los navegadores resuelven `*.localhost` a tu máquina).

## Pruebas

```bash
npm test                # unitarias
npm run test:e2e        # end-to-end con Playwright (requiere la pila levantada)
```

Detalle en [docs/testing.md](docs/testing.md).

## Estructura

Ver `CLAUDE.md`. Agentes en `.claude/agents/`, skills en `.claude/skills/`, migraciones en `db/migrations/`, retos en `challenges/`.

## Uso responsable

Solo con fines educativos. Está prohibido usar las técnicas fuera de la plataforma.
