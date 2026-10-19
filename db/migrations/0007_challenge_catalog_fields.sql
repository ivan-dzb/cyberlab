-- Campos del catálogo de retos sincronizados desde challenges/<slug>/challenge.json.
ALTER TABLE challenge
  ADD COLUMN descripcion jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN puerto      integer NOT NULL DEFAULT 8080 CHECK (puerto BETWEEN 1 AND 65535),
  ADD COLUMN limites     jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN visible     boolean NOT NULL DEFAULT true;
