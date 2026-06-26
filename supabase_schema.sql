-- ============================================================
-- Schéma complet — Eberron_Project
-- Fiches de personnage D&D 5e
-- À exécuter dans l'éditeur SQL du tableau de bord Supabase
-- Authentication › Providers › Email : doit être activé
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- 0. NETTOYAGE (supprime l'ancien schéma de test)
-- ══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS equipement_tags   CASCADE;
DROP TABLE IF EXISTS tags              CASCADE;
DROP TABLE IF EXISTS equipement        CASCADE;
DROP TABLE IF EXISTS equipement_base   CASCADE;
DROP TABLE IF EXISTS capacites         CASCADE;
DROP TABLE IF EXISTS sorts             CASCADE;
DROP TABLE IF EXISTS emplacements_sorts CASCADE;
DROP TABLE IF EXISTS armes             CASCADE;
DROP TABLE IF EXISTS competences       CASCADE;
DROP TABLE IF EXISTS caracteristiques  CASCADE;
DROP TABLE IF EXISTS profils           CASCADE;
DROP TABLE IF EXISTS personnages       CASCADE;

DROP FUNCTION IF EXISTS init_personnage()          CASCADE;
DROP FUNCTION IF EXISTS set_updated_at()           CASCADE;
DROP FUNCTION IF EXISTS create_profil_on_signup()  CASCADE;
DROP FUNCTION IF EXISTS cascade_delete_conteneur() CASCADE;


-- ══════════════════════════════════════════════════════════════
-- 1. TABLE PRINCIPALE — personnages
-- ══════════════════════════════════════════════════════════════

CREATE TABLE personnages (
  id                          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Bloc 1 · Identité
  nom                         text        NOT NULL DEFAULT 'Nouveau personnage',
  classe                      text,
  niveau                      int         NOT NULL DEFAULT 1 CHECK (niveau BETWEEN 1 AND 20),
  race                        text,
  age                         int,
  taille_cm                   int,
  poids_kg                    numeric(5,1),
  dieu                        text,
  devise                      text,
  xp                          int         NOT NULL DEFAULT 0,
  alignement                  text,

  -- Bloc 3 · Vitesses (en mètres)
  vitesse_base_m              int         NOT NULL DEFAULT 9,
  vitesse_nage_m              int,
  vitesse_escalade_m          int,
  vitesse_vol_m               int,

  -- Bloc 4 · Armure
  -- type_armure : 'sans' | 'legere' | 'intermediaire' | 'lourde'
  type_armure                 text        NOT NULL DEFAULT 'sans',
  bonus_armure                int         NOT NULL DEFAULT 0,
  bouclier                    boolean     NOT NULL DEFAULT false,
  bonus_armure_magie          int         NOT NULL DEFAULT 0,
  bonus_armure_autre          int         NOT NULL DEFAULT 0,

  -- Bloc 5 · Points de vie
  -- type_de_vie : 'd6' | 'd8' | 'd10' | 'd12'
  type_de_vie                 text        NOT NULL DEFAULT 'd8',
  pv_max                      int,
  pv_actuel                   int,
  pv_temporaires              int         NOT NULL DEFAULT 0,
  des_de_vie_depenses         int         NOT NULL DEFAULT 0,
  jds_succes                  int         NOT NULL DEFAULT 0 CHECK (jds_succes BETWEEN 0 AND 3),
  jds_echecs                  int         NOT NULL DEFAULT 0 CHECK (jds_echecs BETWEEN 0 AND 3),
  -- Jets de dé par niveau : tableau JSON [roll_niv1, roll_niv2, ...]
  -- roll_niv1 = max du dé (calculé auto) ; niveaux suivants = jet réel du joueur (null si non saisi)
  pv_niveaux_roules           jsonb       NOT NULL DEFAULT '[]',

  -- Bloc 6 · Inspiration
  inspiration                 boolean     NOT NULL DEFAULT false,

  -- Bloc 9 · Sorts
  -- caracteristique_incantation : 'charisme' | 'sagesse' | 'intelligence'
  caracteristique_incantation text,

  -- Bloc 10 · Traits & capacités
  traits_raciaux              text,
  capacites_classe            text,
  maitrises_langues           text,

  -- Bloc 11 · Personnalité
  trait_personnalite_1        text,
  trait_personnalite_2        text,
  ideal                       text,
  lien                        text,
  defaut                      text,
  historique_background       text,

  -- Bloc 12 · Notes
  notes                       text,

  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);


-- ══════════════════════════════════════════════════════════════
-- 2. PROFILS UTILISATEURS
-- Étend auth.users avec le rôle MJ / joueur
-- ══════════════════════════════════════════════════════════════

CREATE TABLE profils (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  is_mj       boolean     NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now()
);


-- ══════════════════════════════════════════════════════════════
-- 3. CARACTÉRISTIQUES (1 ligne par personnage)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE caracteristiques (
  id                        uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  personnage_id             uuid    NOT NULL REFERENCES personnages(id) ON DELETE CASCADE UNIQUE,

  -- 6 statistiques
  force                     int     NOT NULL DEFAULT 10 CHECK (force        BETWEEN 1 AND 30),
  intelligence              int     NOT NULL DEFAULT 10 CHECK (intelligence BETWEEN 1 AND 30),
  sagesse                   int     NOT NULL DEFAULT 10 CHECK (sagesse      BETWEEN 1 AND 30),
  dexterite                 int     NOT NULL DEFAULT 10 CHECK (dexterite    BETWEEN 1 AND 30),
  constitution              int     NOT NULL DEFAULT 10 CHECK (constitution BETWEEN 1 AND 30),
  charisme                  int     NOT NULL DEFAULT 10 CHECK (charisme     BETWEEN 1 AND 30),

  -- Maîtrises des jets de sauvegarde
  maitrise_jds_force        boolean NOT NULL DEFAULT false,
  maitrise_jds_intelligence boolean NOT NULL DEFAULT false,
  maitrise_jds_sagesse      boolean NOT NULL DEFAULT false,
  maitrise_jds_dexterite    boolean NOT NULL DEFAULT false,
  maitrise_jds_constitution boolean NOT NULL DEFAULT false,
  maitrise_jds_charisme     boolean NOT NULL DEFAULT false
);


-- ══════════════════════════════════════════════════════════════
-- 4. COMPÉTENCES (18 lignes par personnage)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE competences (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  personnage_id uuid    NOT NULL REFERENCES personnages(id) ON DELETE CASCADE,
  nom           text    NOT NULL,   -- 'acrobaties', 'arcanes', etc.
  maitrise      boolean NOT NULL DEFAULT false,
  expertise     boolean NOT NULL DEFAULT false,
  UNIQUE(personnage_id, nom)
);


-- ══════════════════════════════════════════════════════════════
-- 5. ARMES (N lignes par personnage)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE armes (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  personnage_id        uuid        NOT NULL REFERENCES personnages(id) ON DELETE CASCADE,
  nom                  text        NOT NULL DEFAULT 'Arme',
  -- caracteristique : 'force' | 'dexterite'
  caracteristique      text        NOT NULL DEFAULT 'force',
  maitrise             boolean     NOT NULL DEFAULT true,
  bonus_magie          int         NOT NULL DEFAULT 0,
  bonus_special        int         NOT NULL DEFAULT 0,
  de_degats            text        NOT NULL DEFAULT '1d6',
  bonus_degats_special int         NOT NULL DEFAULT 0,
  -- type_degats : 'tranchant' | 'perforant' | 'contondant' | autre
  type_degats          text,
  ordre                int         NOT NULL DEFAULT 0,
  created_at           timestamptz DEFAULT now()
);


-- ══════════════════════════════════════════════════════════════
-- 6. EMPLACEMENTS DE SORTS (niveaux 0–9, 10 lignes par personnage)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE emplacements_sorts (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  personnage_id         uuid NOT NULL REFERENCES personnages(id) ON DELETE CASCADE,
  niveau_sort           int  NOT NULL CHECK (niveau_sort BETWEEN 0 AND 9),
  max_emplacements      int  NOT NULL DEFAULT 0,
  emplacements_utilises int  NOT NULL DEFAULT 0,
  sorts_prepares        int  NOT NULL DEFAULT 0,
  UNIQUE(personnage_id, niveau_sort)
);


-- ══════════════════════════════════════════════════════════════
-- 7. SORTS (N lignes par personnage)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE sorts (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  personnage_id     uuid        NOT NULL REFERENCES personnages(id) ON DELETE CASCADE,
  nom               text        NOT NULL,
  niveau_sort       int         NOT NULL DEFAULT 0 CHECK (niveau_sort BETWEEN 0 AND 9),
  prepare           boolean     NOT NULL DEFAULT false,
  temps_incantation text,
  duree             text,
  portee            text,
  concentration     boolean     NOT NULL DEFAULT false,
  composante_v      boolean     NOT NULL DEFAULT false,
  composante_s      boolean     NOT NULL DEFAULT false,
  composante_m      boolean     NOT NULL DEFAULT false,
  description       text,
  ordre             int         NOT NULL DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);


-- ══════════════════════════════════════════════════════════════
-- 8. CAPACITÉS À UTILISATIONS LIMITÉES (N lignes par personnage)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE capacites (
  id                     uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  personnage_id          uuid        NOT NULL REFERENCES personnages(id) ON DELETE CASCADE,
  nom                    text        NOT NULL,
  max_utilisations       int         NOT NULL DEFAULT 1,
  utilisations_actuelles int         NOT NULL DEFAULT 0,
  -- rechargement : 'court' | 'long' | 'aube' | 'jamais'
  rechargement           text        NOT NULL DEFAULT 'long',
  -- action_requise : 'Action' | 'Action bonus' | 'Réaction' | 'Libre'
  action_requise         text,
  description            text,
  ordre                  int         NOT NULL DEFAULT 0,
  created_at             timestamptz DEFAULT now()
);


-- ══════════════════════════════════════════════════════════════
-- 9. ÉQUIPEMENT DE BASE (catalogue officiel, géré par le MJ)
-- ══════════════════════════════════════════════════════════════
-- nom_normalise : calculé côté JS (minuscule, accents retirés) avant insert,
-- utilisé pour la détection de doublons à l'import CSV.
-- tags : libellés convertis en tags personnels du joueur lors de l'import
-- sur sa fiche (pas de FK, les tags sont scopés par personnage).

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


-- ══════════════════════════════════════════════════════════════
-- 10. ÉQUIPEMENT & POSSESSIONS (N lignes par personnage)
-- ══════════════════════════════════════════════════════════════
-- valeur_pc : valeur de l'objet en pièces de cuivre (conversion à l'affichage).
-- base_id : référence informative vers l'objet officiel d'origine (NULL si
-- objet custom ou si l'objet de base a été supprimé du catalogue depuis).

CREATE TABLE equipement (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  personnage_id uuid        NOT NULL REFERENCES personnages(id) ON DELETE CASCADE,
  nom           text        NOT NULL,
  -- type : 'equipement' | 'possession' | 'magique'
  type          text        NOT NULL DEFAULT 'equipement',
  description   text,
  quantite      int         NOT NULL DEFAULT 1,
  poids         numeric(8,3),
  valeur_pc     int         NOT NULL DEFAULT 0,
  base_id       uuid        REFERENCES equipement_base(id) ON DELETE SET NULL,
  ordre         int         NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);


-- ══════════════════════════════════════════════════════════════
-- 11. TAGS (libres, créés à la demande par personnage)
-- ══════════════════════════════════════════════════════════════
-- systeme : 'monnaie' | 'equipe' | 'base' | NULL (tag libre).
-- conteneur_equipement_id : si non NULL, ce tag est un tag-conteneur lié à
-- un objet précis de l'inventaire (ex. "Bourse") ; les objets qui portent ce
-- tag sont considérés comme rangés dans cet objet. Pas de contrainte
-- UNIQUE(personnage_id, nom) : plusieurs tags-conteneurs homonymes doivent
-- pouvoir coexister (ex. deux "Bourse" différentes) — désambiguïsation "#n"
-- calculée côté front à l'affichage, jamais stockée en DB.

CREATE TABLE tags (
  id                      uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  personnage_id           uuid        NOT NULL REFERENCES personnages(id) ON DELETE CASCADE,
  nom                     text        NOT NULL,
  systeme                 text,
  conteneur_equipement_id uuid        REFERENCES equipement(id) ON DELETE CASCADE,
  ordre                   int         NOT NULL DEFAULT 0,
  created_at              timestamptz DEFAULT now()
);


-- ══════════════════════════════════════════════════════════════
-- 12. EQUIPEMENT_TAGS (liaison many-to-many)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE equipement_tags (
  equipement_id uuid NOT NULL REFERENCES equipement(id) ON DELETE CASCADE,
  tag_id        uuid NOT NULL REFERENCES tags(id)       ON DELETE CASCADE,
  PRIMARY KEY (equipement_id, tag_id)
);


-- ══════════════════════════════════════════════════════════════
-- INDEX
-- ══════════════════════════════════════════════════════════════

CREATE INDEX idx_personnages_user_id    ON personnages(user_id);
CREATE INDEX idx_caracteristiques_pid   ON caracteristiques(personnage_id);
CREATE INDEX idx_competences_pid        ON competences(personnage_id);
CREATE INDEX idx_armes_pid              ON armes(personnage_id, ordre);
CREATE INDEX idx_emplacements_pid       ON emplacements_sorts(personnage_id, niveau_sort);
CREATE INDEX idx_sorts_pid              ON sorts(personnage_id, niveau_sort, ordre);
CREATE INDEX idx_capacites_pid          ON capacites(personnage_id, ordre);
CREATE INDEX idx_equipement_pid         ON equipement(personnage_id, ordre);
CREATE UNIQUE INDEX idx_equipement_base_nom_normalise ON equipement_base(nom_normalise);
CREATE INDEX idx_equipement_base_nom    ON equipement_base(nom);
CREATE INDEX idx_tags_pid               ON tags(personnage_id);
CREATE INDEX idx_tags_conteneur         ON tags(conteneur_equipement_id);
CREATE INDEX idx_equipement_tags_tag    ON equipement_tags(tag_id);


-- ══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════════════════════

-- ── Mise à jour automatique de updated_at ───────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_personnages_updated_at
  BEFORE UPDATE ON personnages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── Cascade conteneur → contenu ──────────────────────────────
-- Supprimer un objet conteneur (ex. "Bourse") supprime aussi les objets
-- qui portent le tag-conteneur associé. PostgreSQL gère nativement la
-- récursion si un conteneur contient un autre conteneur ; aucun cycle
-- n'est possible puisqu'un objet ne peut pas se contenir lui-même (le
-- conteneur est lié au tag, pas directement à l'objet contenu).
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


-- ── Initialisation automatique des tables enfants ────────────
-- Déclenché après chaque INSERT dans personnages.
-- Crée les lignes obligatoires (1 pour caracteristiques,
-- 18 pour competences, 10 pour emplacements_sorts).
CREATE OR REPLACE FUNCTION init_personnage()
RETURNS TRIGGER AS $$
DECLARE
  comp text;
  niv  int;
BEGIN
  -- 1 ligne de caractéristiques
  INSERT INTO caracteristiques (personnage_id) VALUES (NEW.id);

  -- 18 lignes de compétences
  FOREACH comp IN ARRAY ARRAY[
    'acrobaties', 'arcanes',     'athletisme',   'discretion',
    'dressage',   'escamotage',  'histoire',     'intimidation',
    'investigation', 'medecine', 'nature',       'perception',
    'perspicacite',  'persuasion','religion',    'representation',
    'survie',     'tromperie'
  ] LOOP
    INSERT INTO competences (personnage_id, nom) VALUES (NEW.id, comp);
  END LOOP;

  -- 10 lignes d'emplacements de sorts (niveaux 0 à 9)
  FOR niv IN 0..9 LOOP
    INSERT INTO emplacements_sorts (personnage_id, niveau_sort) VALUES (NEW.id, niv);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_init_personnage
  AFTER INSERT ON personnages
  FOR EACH ROW EXECUTE FUNCTION init_personnage();


-- ── Création automatique du profil à l'inscription ───────────
-- Déclenché après chaque nouvel utilisateur dans auth.users.
CREATE OR REPLACE FUNCTION create_profil_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profils (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trig_create_profil
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profil_on_signup();


-- ══════════════════════════════════════════════════════════════
-- RLS — ROW LEVEL SECURITY
-- PHASE DE DÉVELOPPEMENT : policies permissives (accès total)
-- Remplacer par les policies de production en Phase 5
-- ══════════════════════════════════════════════════════════════

ALTER TABLE personnages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profils            ENABLE ROW LEVEL SECURITY;
ALTER TABLE caracteristiques   ENABLE ROW LEVEL SECURITY;
ALTER TABLE competences        ENABLE ROW LEVEL SECURITY;
ALTER TABLE armes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE emplacements_sorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacites          ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipement         ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipement_base    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags               ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipement_tags    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all" ON personnages        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON profils            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON caracteristiques   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON competences        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON armes              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON emplacements_sorts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON sorts              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON capacites          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON equipement         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON equipement_base    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON tags               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON equipement_tags    FOR ALL USING (true) WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- POLICIES DE PRODUCTION (Phase 5 — décommenter et activer)
-- ══════════════════════════════════════════════════════════════

/*
-- Supprimer les policies dev avant d'activer celles-ci :
-- DROP POLICY "dev_all" ON personnages; -- (etc. pour chaque table)

-- Helper : vérifie si l'utilisateur connecté est MJ
CREATE OR REPLACE FUNCTION is_mj()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profils WHERE id = auth.uid() AND is_mj = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- personnages : joueur voit sa fiche, MJ voit tout
CREATE POLICY "prod_personnages" ON personnages
  FOR ALL USING (
    auth.uid() = user_id OR is_mj()
  )
  WITH CHECK (
    auth.uid() = user_id OR is_mj()
  );

-- Tables enfants : accès via le personnage associé
CREATE POLICY "prod_caracteristiques" ON caracteristiques
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM personnages p
      WHERE p.id = personnage_id
        AND (p.user_id = auth.uid() OR is_mj())
    )
  );

CREATE POLICY "prod_competences" ON competences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM personnages p
      WHERE p.id = personnage_id
        AND (p.user_id = auth.uid() OR is_mj())
    )
  );

CREATE POLICY "prod_armes" ON armes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM personnages p
      WHERE p.id = personnage_id
        AND (p.user_id = auth.uid() OR is_mj())
    )
  );

CREATE POLICY "prod_emplacements" ON emplacements_sorts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM personnages p
      WHERE p.id = personnage_id
        AND (p.user_id = auth.uid() OR is_mj())
    )
  );

CREATE POLICY "prod_sorts" ON sorts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM personnages p
      WHERE p.id = personnage_id
        AND (p.user_id = auth.uid() OR is_mj())
    )
  );

CREATE POLICY "prod_capacites" ON capacites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM personnages p
      WHERE p.id = personnage_id
        AND (p.user_id = auth.uid() OR is_mj())
    )
  );

CREATE POLICY "prod_equipement" ON equipement
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM personnages p
      WHERE p.id = personnage_id
        AND (p.user_id = auth.uid() OR is_mj())
    )
  );

-- equipement_base : catalogue officiel — lecture pour tous, écriture MJ uniquement
CREATE POLICY "prod_equipement_base_select" ON equipement_base
  FOR SELECT USING (true);
CREATE POLICY "prod_equipement_base_write" ON equipement_base
  FOR INSERT WITH CHECK (is_mj());
CREATE POLICY "prod_equipement_base_update" ON equipement_base
  FOR UPDATE USING (is_mj());
CREATE POLICY "prod_equipement_base_delete" ON equipement_base
  FOR DELETE USING (is_mj());

CREATE POLICY "prod_tags" ON tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM personnages p
      WHERE p.id = personnage_id
        AND (p.user_id = auth.uid() OR is_mj())
    )
  );

CREATE POLICY "prod_equipement_tags" ON equipement_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM equipement e
      JOIN personnages p ON p.id = e.personnage_id
      WHERE e.id = equipement_id
        AND (p.user_id = auth.uid() OR is_mj())
    )
  );

-- profils : chaque utilisateur voit uniquement son propre profil, MJ voit tout
CREATE POLICY "prod_profils" ON profils
  FOR ALL USING (
    auth.uid() = id OR is_mj()
  );
*/


-- ══════════════════════════════════════════════════════════════
-- REALTIME
-- ══════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE personnages;


-- ══════════════════════════════════════════════════════════════
-- DONNÉES DE DÉMONSTRATION
-- user_id laissé NULL (à assigner après création des comptes Auth)
-- ══════════════════════════════════════════════════════════════

INSERT INTO personnages (
  nom, classe, niveau, race, xp,
  vitesse_base_m, type_armure, bonus_armure, bouclier,
  type_de_vie, pv_max, pv_actuel,
  caracteristique_incantation,
  maitrises_langues
) VALUES
  (
    'Kael d''Cannith', 'Artificier', 3, 'Forgelier', 900,
    9, 'intermediaire', 16, false,
    'd8', 24, 24,
    'intelligence',
    'Commun, Nain, Elfique'
  ),
  (
    'Sira Venti', 'Roublard', 4, 'Changelin', 2700,
    9, 'legere', 13, false,
    'd8', 28, 20,
    NULL,
    'Commun, Argot des voleurs, Elfe'
  ),
  (
    'Brother Toryn', 'Paladin', 2, 'Humain', 300,
    9, 'lourde', 18, true,
    'd10', 22, 22,
    'charisme',
    'Commun, Céleste'
  );

-- ── Mise à jour des caractéristiques de démonstration ────────
-- Kael d'Cannith (Artificier / Intelligence)
UPDATE caracteristiques SET
  force=10, intelligence=17, sagesse=12, dexterite=14, constitution=14, charisme=8,
  maitrise_jds_intelligence=true, maitrise_jds_constitution=true
WHERE personnage_id = (SELECT id FROM personnages WHERE nom = 'Kael d''Cannith');

-- Sira Venti (Roublard / Dextérité)
UPDATE caracteristiques SET
  force=10, intelligence=14, sagesse=12, dexterite=18, constitution=14, charisme=10,
  maitrise_jds_dexterite=true, maitrise_jds_intelligence=true
WHERE personnage_id = (SELECT id FROM personnages WHERE nom = 'Sira Venti');

-- Brother Toryn (Paladin / Charisme)
UPDATE caracteristiques SET
  force=16, intelligence=10, sagesse=12, dexterite=10, constitution=14, charisme=16,
  maitrise_jds_sagesse=true, maitrise_jds_charisme=true
WHERE personnage_id = (SELECT id FROM personnages WHERE nom = 'Brother Toryn');

-- ── Monnaie de démonstration ─────────────────────────────────
-- La monnaie est représentée par des objets d'équipement tagués "Monnaie".
-- Taux en PC : po=100, pa=10, pc=1 (quantite = nombre de pièces, valeur_pc = taux unitaire).
DO $$
DECLARE
  pid uuid;
  tag_id uuid;
BEGIN
  -- Kael d'Cannith : 45 po, 12 pa
  SELECT id INTO pid FROM personnages WHERE nom = 'Kael d''Cannith';
  INSERT INTO tags (personnage_id, nom, systeme) VALUES (pid, 'Monnaie', 'monnaie') RETURNING id INTO tag_id;
  INSERT INTO equipement (personnage_id, nom, quantite, valeur_pc)
    VALUES (pid, 'Pièces d''or', 45, 100), (pid, 'Pièces d''argent', 12, 10);
  INSERT INTO equipement_tags (equipement_id, tag_id)
    SELECT id, tag_id FROM equipement WHERE personnage_id = pid AND nom IN ('Pièces d''or', 'Pièces d''argent');

  -- Sira Venti : 120 po, 50 pc
  SELECT id INTO pid FROM personnages WHERE nom = 'Sira Venti';
  INSERT INTO tags (personnage_id, nom, systeme) VALUES (pid, 'Monnaie', 'monnaie') RETURNING id INTO tag_id;
  INSERT INTO equipement (personnage_id, nom, quantite, valeur_pc)
    VALUES (pid, 'Pièces d''or', 120, 100), (pid, 'Pièces de cuivre', 50, 1);
  INSERT INTO equipement_tags (equipement_id, tag_id)
    SELECT id, tag_id FROM equipement WHERE personnage_id = pid AND nom IN ('Pièces d''or', 'Pièces de cuivre');

  -- Brother Toryn : 30 po, 5 pa
  SELECT id INTO pid FROM personnages WHERE nom = 'Brother Toryn';
  INSERT INTO tags (personnage_id, nom, systeme) VALUES (pid, 'Monnaie', 'monnaie') RETURNING id INTO tag_id;
  INSERT INTO equipement (personnage_id, nom, quantite, valeur_pc)
    VALUES (pid, 'Pièces d''or', 30, 100), (pid, 'Pièces d''argent', 5, 10);
  INSERT INTO equipement_tags (equipement_id, tag_id)
    SELECT id, tag_id FROM equipement WHERE personnage_id = pid AND nom IN ('Pièces d''or', 'Pièces d''argent');
END $$;
