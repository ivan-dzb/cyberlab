-- Estado de las sesiones de contenedor. El id de la fila es también el id de sesión del orquestador/gateway.
ALTER TABLE container_session
  ALTER COLUMN container_id DROP NOT NULL,
  ADD COLUMN estado text NOT NULL DEFAULT 'iniciando'
    CHECK (estado IN ('iniciando', 'activa', 'terminada', 'expirada', 'error')),
  ADD COLUMN terminada_en timestamptz,
  ADD COLUMN flag_hash text;

-- Una sesión activa por usuario (limita recursos y abuso).
CREATE UNIQUE INDEX uniq_container_session_active_user
  ON container_session (user_id) WHERE estado IN ('iniciando', 'activa');
