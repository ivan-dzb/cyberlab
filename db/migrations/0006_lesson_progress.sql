-- Progreso de lecciones por usuario. El contenido vive en archivos (content/modules), se referencia por slug.
CREATE TABLE lesson_progress (
  user_id      uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  module_slug  text NOT NULL,
  lesson_slug  text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_slug, lesson_slug)
);
