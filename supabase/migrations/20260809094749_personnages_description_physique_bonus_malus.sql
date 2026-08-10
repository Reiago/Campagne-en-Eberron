-- ============================================================
-- Ajoute description_physique et bonus_malus sur personnages.
-- Ces colonnes existaient déjà en production (appliquées hors
-- migration) et dans supabase_schema.sql, mais n'avaient jamais
-- été migrées en local.
-- ============================================================

ALTER TABLE public.personnages
  ADD COLUMN IF NOT EXISTS description_physique text,
  ADD COLUMN IF NOT EXISTS bonus_malus text;
