# CyberLab

Plataforma web pública y gratuita para aprender pentesting y hacking ético con retos prácticos aislados en contenedores. **Estado: Fase 1 (esqueleto)** – sin retos vulnerables ni autenticación completa todavía.

Contexto del proyecto: [CLAUDE.md](CLAUDE.md) · Arquitectura: [docs/architecture.md](docs/architecture.md)

## Requisitos

- Docker Desktop (con Compose v2)
- Node.js 22+ (solo si corres fuera de Docker)

## Instalación

```bash
cp .env.example .env      # edita POSTGRES_PASSWORD
docker compose up --build
```

En otra terminal, aplica el esquema:

```bash
docker compose exec app npm run migrate
```

Abre http://localhost:3000 y comprueba http://localhost:3000/api/health.

### Sin Docker para la app

```bash
npm install
docker compose up -d db
npm run migrate   # requiere DATABASE_URL (ver .env.example)
npm run dev
```

## Estructura

Ver `CLAUDE.md`. Agentes en `.claude/agents/`, skills en `.claude/skills/`, migraciones en `db/migrations/`, retos en `challenges/`.

## Uso responsable

Solo con fines educativos. Está prohibido usar las técnicas fuera de la plataforma.
