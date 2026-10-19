-- Contadores de ventana fija para rate limiting. `key` es un hash (no se guardan IPs ni correos en claro).
CREATE UNLOGGED TABLE rate_limit (
  key          text NOT NULL,
  window_start timestamptz NOT NULL,
  hits         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX idx_rate_limit_window ON rate_limit (window_start);
