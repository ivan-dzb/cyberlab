-- Esquema inicial. Ver docs/architecture.md.

CREATE TABLE app_user (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE challenge (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  titulo        text NOT NULL,
  nivel         text NOT NULL CHECK (nivel IN ('principiante', 'intermedio', 'avanzado', 'experto')),
  teoria_md     text NOT NULL DEFAULT '',
  imagen_docker text NOT NULL,
  xp            integer NOT NULL DEFAULT 0 CHECK (xp >= 0)
);

CREATE TABLE tool (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE,
  nombre           text NOT NULL,
  categoria        text NOT NULL,
  descripcion      text NOT NULL DEFAULT '',
  comandos_ejemplo text NOT NULL DEFAULT ''
);

CREATE TABLE challenge_tool (
  challenge_id uuid NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  tool_id      uuid NOT NULL REFERENCES tool(id) ON DELETE CASCADE,
  PRIMARY KEY (challenge_id, tool_id)
);

CREATE TABLE user_progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  challenge_id  uuid NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  estado        text NOT NULL DEFAULT 'no_iniciado' CHECK (estado IN ('no_iniciado', 'en_progreso', 'completado')),
  xp_otorgado   integer NOT NULL DEFAULT 0 CHECK (xp_otorgado >= 0),
  completado_en timestamptz,
  UNIQUE (user_id, challenge_id)
);

CREATE TABLE writeup (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  contenido    text NOT NULL,
  creado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE container_session (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  container_id text NOT NULL,
  iniciado_en  timestamptz NOT NULL DEFAULT now(),
  expira_en    timestamptz NOT NULL
);

CREATE INDEX idx_user_progress_challenge ON user_progress (challenge_id);
CREATE INDEX idx_writeup_user ON writeup (user_id);
CREATE INDEX idx_writeup_challenge ON writeup (challenge_id);
CREATE INDEX idx_challenge_tool_tool ON challenge_tool (tool_id);
CREATE INDEX idx_container_session_user ON container_session (user_id);
CREATE INDEX idx_container_session_expira ON container_session (expira_en);
