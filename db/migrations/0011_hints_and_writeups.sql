-- Pistas escalonadas y writeup oficial por reto, en es/en: {"es": [...], "en": [...]} y {"es": "...", "en": "..."}.
ALTER TABLE challenge
  ADD COLUMN pistas   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN writeup  jsonb NOT NULL DEFAULT '{}'::jsonb;
