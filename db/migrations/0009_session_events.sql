-- Registro de actividad por sesión de reto (inicio, extensión, fin, expiración, errores, señales de abuso).
-- Sirve para detectar abuso y depurar; NO para vigilar el aprendizaje normal (ver términos de uso §5).
CREATE TABLE session_event (
  id         bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES container_session(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  tipo       text NOT NULL CHECK (tipo IN ('inicio', 'extension', 'fin', 'expiracion', 'error', 'trafico_alto', 'huerfana')),
  detalle    jsonb NOT NULL DEFAULT '{}'::jsonb,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_event_session ON session_event (session_id, creado_en);
CREATE INDEX idx_session_event_tipo ON session_event (tipo, creado_en);
