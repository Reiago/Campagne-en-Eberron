-- ============================================================
-- Migration incrémentale — Issue #30 (races/classes en catalogue)
-- À exécuter dans l'éditeur SQL Supabase (local : 127.0.0.1:54323)
-- Ne PAS ré-exécuter supabase_schema.sql en entier : ce script
-- applique uniquement les changements nécessaires sur la base
-- existante, sans perte de données.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- ── 1. Nouvelles tables catalogue ──────────────────────────────
CREATE TABLE races_catalogue (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nom        text        NOT NULL UNIQUE,
  ordre      int         NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE classes_catalogue (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nom        text        NOT NULL UNIQUE,
  ordre      int         NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE capacites_catalogue (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  race_id    uuid        REFERENCES races_catalogue(id)   ON DELETE CASCADE,
  classe_id  uuid        REFERENCES classes_catalogue(id) ON DELETE CASCADE,
  categorie  text        NOT NULL,
  titre      text        NOT NULL,
  valeur     text        NOT NULL,
  ordre      int         NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT capacites_catalogue_un_seul_parent
    CHECK ((race_id IS NOT NULL)::int + (classe_id IS NOT NULL)::int = 1)
);

ALTER TABLE races_catalogue     ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes_catalogue   ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacites_catalogue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_all" ON races_catalogue     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON classes_catalogue   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON capacites_catalogue FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_capacites_catalogue_race   ON capacites_catalogue(race_id, ordre);
CREATE INDEX idx_capacites_catalogue_classe ON capacites_catalogue(classe_id, ordre);

-- ── 2. Seed officiel (issue #30) ───────────────────────────────
INSERT INTO races_catalogue (nom, ordre) VALUES
  ('Changelin', 1), ('Demi elfe', 2), ('Demi orc', 3), ('Drakeide', 4), ('Elfe', 5),
  ('Féral', 6), ('Forgelier', 7), ('Gnome', 8), ('Hobbit', 9), ('Humain', 10),
  ('Kalashtar', 11), ('Nain', 12);

INSERT INTO classes_catalogue (nom, ordre) VALUES
  ('Artificier', 1), ('Barbare', 2), ('Barde', 3), ('Clerc', 4), ('Ensorceleur', 5),
  ('Guerrier', 6), ('Magicien', 7), ('Moine', 8), ('Occultiste', 9), ('Paladin', 10),
  ('Rodeur', 11), ('Roublard', 12);

-- ── 3. personnages : ajout des FK (l'ancien texte race/classe est conservé
--    tel quel comme repli tant qu'il n'a pas été rapproché du catalogue) ──
ALTER TABLE personnages
  ADD COLUMN race_id  uuid REFERENCES races_catalogue(id)  ON DELETE SET NULL,
  ADD COLUMN classe_id uuid REFERENCES classes_catalogue(id) ON DELETE SET NULL;

CREATE INDEX idx_personnages_race_id   ON personnages(race_id);
CREATE INDEX idx_personnages_classe_id ON personnages(classe_id);

-- Rapprochement automatique (insensible accents/casse) des personnages
-- existants avec le catalogue.
UPDATE personnages p SET race_id = r.id
FROM races_catalogue r
WHERE p.race IS NOT NULL
  AND lower(unaccent(trim(p.race))) = lower(unaccent(trim(r.nom)));

UPDATE personnages p SET classe_id = c.id
FROM classes_catalogue c
WHERE p.classe IS NOT NULL
  AND lower(unaccent(trim(p.classe))) = lower(unaccent(trim(c.nom)));

-- ── 4. capacites : nouvelles colonnes (traits raciaux/capacités de classe
--    rejoignent cette table, voir section 5) ───────────────────
ALTER TABLE capacites
  ADD COLUMN origine      text NOT NULL DEFAULT 'perso' CHECK (origine IN ('perso','race','classe')),
  ADD COLUMN categorie    text,
  ADD COLUMN catalogue_id uuid REFERENCES capacites_catalogue(id) ON DELETE SET NULL;

CREATE INDEX idx_capacites_catalogue_id ON capacites(catalogue_id);

-- ── 5. Migration du texte libre traits_raciaux / capacites_classe
--    vers des lignes capacites (aucune perte de contenu) ────────
INSERT INTO capacites (personnage_id, nom, description, origine, max_utilisations, rechargement)
SELECT id, 'Traits raciaux', traits_raciaux, 'race', 0, 'jamais'
FROM personnages WHERE traits_raciaux IS NOT NULL AND btrim(traits_raciaux) <> '';

INSERT INTO capacites (personnage_id, nom, description, origine, max_utilisations, rechargement)
SELECT id, 'Capacités de classe', capacites_classe, 'classe', 0, 'jamais'
FROM personnages WHERE capacites_classe IS NOT NULL AND btrim(capacites_classe) <> '';

ALTER TABLE personnages DROP COLUMN traits_raciaux, DROP COLUMN capacites_classe;

-- NOTE : les colonnes texte personnages.race / personnages.classe sont
-- volontairement conservées (non supprimées) tant que tous les personnages
-- n'ont pas un race_id/classe_id confirmé — vérifier avec la requête
-- ci-dessous, puis DROP COLUMN race, DROP COLUMN classe à la main plus tard :
--
-- SELECT id, nom, race, race_id, classe, classe_id FROM personnages
-- WHERE (race IS NOT NULL AND race_id IS NULL) OR (classe IS NOT NULL AND classe_id IS NULL);