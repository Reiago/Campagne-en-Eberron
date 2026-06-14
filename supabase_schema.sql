-- ============================================================
-- Schéma de test pour Supabase — Eberron_Project
-- À exécuter dans l'éditeur SQL de votre tableau de bord Supabase
-- ============================================================

-- Table de test : personnages
CREATE TABLE IF NOT EXISTS personnages (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nom         text NOT NULL,
  race        text,
  classe      text,
  notes       text,
  created_at  timestamp with time zone DEFAULT now()
);

-- Activer Row Level Security
ALTER TABLE personnages ENABLE ROW LEVEL SECURITY;

-- Politique : lecture publique (pour les tests)
CREATE POLICY "lecture_publique" ON personnages
  FOR SELECT USING (true);

-- Politique : insertion publique (pour les tests)
CREATE POLICY "insertion_publique" ON personnages
  FOR INSERT WITH CHECK (true);

-- Politique : suppression publique (pour les tests)
CREATE POLICY "suppression_publique" ON personnages
  FOR DELETE USING (true);

-- Quelques données de démonstration
INSERT INTO personnages (nom, race, classe, notes) VALUES
  ('Kael d''Cannith', 'Forgelier', 'Artificier', 'Ancien soldat de la Dernière Guerre, maintenant aventurier.'),
  ('Sira Venti', 'Changelin', 'Roublard', 'Espionne pour la Maison Phiarlan, identité inconnue.'),
  ('Brother Toryn', 'Humain', 'Paladin', 'Servant de la Flamme Argentée, en mission à Sharn.');
