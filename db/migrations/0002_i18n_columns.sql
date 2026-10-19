-- Textos traducibles como jsonb {"es": "...", "en": "..."}.
-- Lectura: COALESCE(col->>$locale, col->>'es'). Las tablas aún no tienen datos de catálogo.

ALTER TABLE challenge
  ALTER COLUMN titulo DROP DEFAULT,
  ALTER COLUMN teoria_md DROP DEFAULT,
  ALTER COLUMN titulo TYPE jsonb USING jsonb_build_object('es', titulo),
  ALTER COLUMN teoria_md TYPE jsonb USING jsonb_build_object('es', teoria_md),
  ALTER COLUMN teoria_md SET DEFAULT '{}'::jsonb,
  ADD CONSTRAINT challenge_titulo_es CHECK (titulo ? 'es');

ALTER TABLE tool
  ALTER COLUMN descripcion DROP DEFAULT,
  ALTER COLUMN comandos_ejemplo DROP DEFAULT,
  ALTER COLUMN descripcion TYPE jsonb USING jsonb_build_object('es', descripcion),
  ALTER COLUMN comandos_ejemplo TYPE jsonb USING jsonb_build_object('es', comandos_ejemplo),
  ALTER COLUMN descripcion SET DEFAULT '{}'::jsonb,
  ALTER COLUMN comandos_ejemplo SET DEFAULT '{}'::jsonb;
