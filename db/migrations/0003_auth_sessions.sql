-- Sesiones de autenticación. Solo se guarda el hash SHA-256 del token; el token vive en la cookie.
CREATE TABLE auth_session (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX idx_auth_session_user ON auth_session (user_id);
CREATE INDEX idx_auth_session_expires ON auth_session (expires_at);
