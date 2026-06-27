-- ============================================================
-- DONNÉES — Ajout des pièces de monnaie au catalogue officiel
-- À exécuter dans l'éditeur SQL Supabase.
-- Taux de conversion en PC : pp=1000, po=100, pe=50, pa=10, pc=1.
-- nom_normalise calculé manuellement ici selon la même règle que le front
-- (minuscule, accents retirés) pour la détection de doublons à l'import CSV.
-- tags: 'Monnaie' déclenche automatiquement le tag système "systeme=monnaie"
-- côté joueur lors de l'ajout depuis la base officielle (fiche.js).
-- poids : 0.01 kg (10 g) par pièce, conforme aux règles D&D 5e.
-- ============================================================

INSERT INTO equipement_base (nom, nom_normalise, valeur_pc, poids, tags, description)
VALUES
  ('Pièces de platine',   'pieces de platine',   1000, 0.01, ARRAY['Monnaie'], NULL),
  ('Pièces d''or',        'pieces d''or',         100, 0.01, ARRAY['Monnaie'], NULL),
  ('Pièces d''électrum',  'pieces d''electrum',    50, 0.01, ARRAY['Monnaie'], NULL),
  ('Pièces d''argent',    'pieces d''argent',      10, 0.01, ARRAY['Monnaie'], NULL),
  ('Pièces de cuivre',    'pieces de cuivre',       1, 0.01, ARRAY['Monnaie'], NULL)
ON CONFLICT (nom_normalise) DO NOTHING;
