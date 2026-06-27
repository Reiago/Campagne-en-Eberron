-- ============================================================
-- MIGRATION PHASE 2 — Refonte équipement
-- À exécuter manuellement, dans l'ordre, dans l'éditeur SQL Supabase.
-- Pré-requis : _MIGRATION_equipement_phase1.sql déjà exécuté (table monnaie
-- supprimée, tables tags/equipement_tags/equipement_base en place).
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. Conserver l'information "magique" avant de supprimer le champ type
-- ──────────────────────────────────────────────────────────────
-- Pour chaque personnage ayant au moins un objet type='magique', crée un tag
-- personnel "Magique" (libre, systeme NULL) et l'attache à ces objets, afin
-- de ne pas perdre cette information lors de la suppression de la colonne.

DO $$
DECLARE
  rec RECORD;
  tag_id uuid;
BEGIN
  FOR rec IN
    SELECT DISTINCT personnage_id FROM equipement WHERE type = 'magique'
  LOOP
    INSERT INTO tags (personnage_id, nom) VALUES (rec.personnage_id, 'Magique')
    RETURNING id INTO tag_id;

    INSERT INTO equipement_tags (equipement_id, tag_id)
    SELECT id, tag_id FROM equipement
    WHERE personnage_id = rec.personnage_id AND type = 'magique';
  END LOOP;
END $$;


-- ──────────────────────────────────────────────────────────────
-- 2. VÉRIFICATION MANUELLE — à exécuter avant l'étape 3
-- ──────────────────────────────────────────────────────────────
-- Le nombre d'objets type='magique' doit être égal au nombre de liaisons
-- equipement_tags créées vers des tags nommés "Magique".

SELECT
  (SELECT COUNT(*) FROM equipement WHERE type = 'magique') AS nb_objets_magiques,
  (SELECT COUNT(*) FROM equipement_tags et JOIN tags t ON t.id = et.tag_id WHERE t.nom = 'Magique') AS nb_liaisons_magique;


-- ──────────────────────────────────────────────────────────────
-- 3. Suppression de la colonne type — IRRÉVERSIBLE
-- N'exécuter qu'après avoir validé l'étape 2 (les deux comptes doivent être égaux).
-- ──────────────────────────────────────────────────────────────

ALTER TABLE equipement DROP COLUMN type;
