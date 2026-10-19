-- Envío de banderas, XP y pistas (Fase 2).
ALTER TABLE user_progress ADD COLUMN pistas_usadas integer NOT NULL DEFAULT 0 CHECK (pistas_usadas >= 0);

-- Nuevo evento de sesión: bandera correcta.
ALTER TABLE session_event DROP CONSTRAINT session_event_tipo_check;
ALTER TABLE session_event ADD CONSTRAINT session_event_tipo_check
  CHECK (tipo IN ('inicio', 'extension', 'fin', 'expiracion', 'error', 'trafico_alto', 'huerfana', 'bandera_ok'));
