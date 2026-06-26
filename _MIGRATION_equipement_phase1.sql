-- ============================================================
-- MIGRATION PHASE 1 — Refonte équipement
-- À exécuter manuellement, dans l'ordre, dans l'éditeur SQL Supabase
-- (base déjà en production avec des personnages existants).
-- supabase_schema.sql a été mis à jour en parallèle comme documentation
-- de l'état cible — ce fichier est le script d'ALTER incrémental réel.
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. Nouvelles tables
-- ──────────────────────────────────────────────────────────────

CREATE TABLE equipement_base (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nom           text        NOT NULL,
  nom_normalise text        NOT NULL,
  valeur_pc     int         NOT NULL DEFAULT 0,
  poids         numeric(8,3),
  tags          text[]      NOT NULL DEFAULT '{}',
  description   text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_equipement_base_nom_normalise ON equipement_base(nom_normalise);
CREATE INDEX idx_equipement_base_nom ON equipement_base(nom);

ALTER TABLE equipement_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_all" ON equipement_base FOR ALL USING (true) WITH CHECK (true);


-- ──────────────────────────────────────────────────────────────
-- 2. Nouvelles colonnes sur equipement
-- ──────────────────────────────────────────────────────────────
-- Le champ "type" (equipement/possession/magique) N'EST PAS supprimé à cette
-- étape : le front-end (fiche.js) en dépend toujours jusqu'à la Phase 2.

ALTER TABLE equipement
  ADD COLUMN valeur_pc int NOT NULL DEFAULT 0,
  ADD COLUMN base_id   uuid REFERENCES equipement_base(id) ON DELETE SET NULL;


-- ──────────────────────────────────────────────────────────────
-- 3. Table tags + table de liaison equipement_tags
-- ──────────────────────────────────────────────────────────────

CREATE TABLE tags (
  id                      uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  personnage_id           uuid        NOT NULL REFERENCES personnages(id) ON DELETE CASCADE,
  nom                     text        NOT NULL,
  systeme                 text,       -- 'monnaie' | 'equipe' | 'base' | NULL (tag libre)
  conteneur_equipement_id uuid        REFERENCES equipement(id) ON DELETE CASCADE,
  ordre                   int         NOT NULL DEFAULT 0,
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_tags_pid       ON tags(personnage_id);
CREATE INDEX idx_tags_conteneur ON tags(conteneur_equipement_id);

CREATE TABLE equipement_tags (
  equipement_id uuid NOT NULL REFERENCES equipement(id) ON DELETE CASCADE,
  tag_id        uuid NOT NULL REFERENCES tags(id)       ON DELETE CASCADE,
  PRIMARY KEY (equipement_id, tag_id)
);

CREATE INDEX idx_equipement_tags_tag ON equipement_tags(tag_id);

ALTER TABLE tags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipement_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_all" ON tags            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON equipement_tags FOR ALL USING (true) WITH CHECK (true);


-- ──────────────────────────────────────────────────────────────
-- 4. Trigger de cascade conteneur → contenu
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cascade_delete_conteneur()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM equipement
  WHERE id IN (
    SELECT et.equipement_id
    FROM equipement_tags et
    JOIN tags t ON t.id = et.tag_id
    WHERE t.conteneur_equipement_id = OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_cascade_conteneur
  BEFORE DELETE ON equipement
  FOR EACH ROW EXECUTE FUNCTION cascade_delete_conteneur();


-- ──────────────────────────────────────────────────────────────
-- 5. Migration des données : monnaie → objets equipement tagués "Monnaie"
-- ──────────────────────────────────────────────────────────────
-- Taux de conversion en PC : pp=1000, po=100, pe=50, pa=10, pc=1.
-- Convention : un objet par dénomination détenue, quantite = nombre de
-- pièces, valeur_pc = taux unitaire de la dénomination (pas la valeur totale).

-- 5a. Un tag système "Monnaie" par personnage qui détient au moins une pièce
INSERT INTO tags (personnage_id, nom, systeme)
SELECT DISTINCT personnage_id, 'Monnaie', 'monnaie'
FROM monnaie
WHERE pp > 0 OR po > 0 OR pe > 0 OR pa > 0 OR pc > 0;

-- 5b. Un objet equipement par dénomination non nulle
WITH denominations AS (
  SELECT personnage_id, 'Pièces de platine'   AS nom, pp AS quantite, 1000 AS taux FROM monnaie WHERE pp > 0
  UNION ALL
  SELECT personnage_id, 'Pièces d''or',        po,         100  FROM monnaie WHERE po > 0
  UNION ALL
  SELECT personnage_id, 'Pièces d''électrum',  pe,         50   FROM monnaie WHERE pe > 0
  UNION ALL
  SELECT personnage_id, 'Pièces d''argent',    pa,         10   FROM monnaie WHERE pa > 0
  UNION ALL
  SELECT personnage_id, 'Pièces de cuivre',    pc,         1    FROM monnaie WHERE pc > 0
)
INSERT INTO equipement (personnage_id, nom, quantite, valeur_pc, ordre)
SELECT personnage_id, nom, quantite, taux, 0
FROM denominations;

-- 5c. Lier ces objets nouvellement créés au tag "Monnaie" du même personnage
INSERT INTO equipement_tags (equipement_id, tag_id)
SELECT e.id, t.id
FROM equipement e
JOIN tags t ON t.personnage_id = e.personnage_id AND t.systeme = 'monnaie'
WHERE e.nom IN ('Pièces de platine', 'Pièces d''or', 'Pièces d''électrum', 'Pièces d''argent', 'Pièces de cuivre')
  AND e.created_at >= now() - interval '5 minutes';


-- ──────────────────────────────────────────────────────────────
-- 6. VÉRIFICATION MANUELLE — à exécuter avant l'étape 7 (DROP TABLE)
-- ──────────────────────────────────────────────────────────────
-- Comparer, pour chaque personnage, le total en PC reconstitué depuis les
-- nouveaux objets "Monnaie" avec l'ancien total stocké dans la table monnaie.
-- Les deux colonnes total_ancien et total_nouveau doivent être strictement
-- égales sur toutes les lignes avant de continuer.

SELECT
  m.personnage_id,
  (m.pp*1000 + m.po*100 + m.pe*50 + m.pa*10 + m.pc) AS total_ancien,
  COALESCE((
    SELECT SUM(e.quantite * e.valeur_pc)
    FROM equipement e
    JOIN equipement_tags et ON et.equipement_id = e.id
    JOIN tags t ON t.id = et.tag_id AND t.systeme = 'monnaie'
    WHERE e.personnage_id = m.personnage_id
  ), 0) AS total_nouveau
FROM monnaie m;


-- ──────────────────────────────────────────────────────────────
-- 7. Suppression de la table monnaie — IRRÉVERSIBLE
-- N'exécuter qu'après avoir validé que la requête de vérification
-- ci-dessus montre total_ancien = total_nouveau pour toutes les lignes.
-- ──────────────────────────────────────────────────────────────

DROP TABLE monnaie CASCADE;


-- ──────────────────────────────────────────────────────────────
-- 8. Mise à jour du trigger init_personnage()
-- Retire l'insertion automatique dans la table monnaie (qui n'existe plus)
-- pour les futurs personnages créés.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION init_personnage()
RETURNS TRIGGER AS $$
DECLARE
  comp text;
  niv  int;
BEGIN
  INSERT INTO caracteristiques (personnage_id) VALUES (NEW.id);

  FOREACH comp IN ARRAY ARRAY[
    'acrobaties', 'arcanes',     'athletisme',   'discretion',
    'dressage',   'escamotage',  'histoire',     'intimidation',
    'investigation', 'medecine', 'nature',       'perception',
    'perspicacite',  'persuasion','religion',    'representation',
    'survie',     'tromperie'
  ] LOOP
    INSERT INTO competences (personnage_id, nom) VALUES (NEW.id, comp);
  END LOOP;

  FOR niv IN 0..9 LOOP
    INSERT INTO emplacements_sorts (personnage_id, niveau_sort) VALUES (NEW.id, niv);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
