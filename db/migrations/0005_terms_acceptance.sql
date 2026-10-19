-- Aceptación de términos de uso al registrarse (versión + fecha).
ALTER TABLE app_user
  ADD COLUMN tos_version text,
  ADD COLUMN tos_accepted_at timestamptz;
