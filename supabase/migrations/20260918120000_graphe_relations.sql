-- ============================================================
-- Graphe des relations entre personnages (page relations.html)
-- Deux tables indépendantes des fiches de personnage :
--   graphe_personnages : un nœud par personnage / organisation
--   graphe_liens       : une relation entre deux nœuds
-- ============================================================

CREATE TABLE IF NOT EXISTS public.graphe_personnages (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nom         text        NOT NULL,
  -- type : 'pj' | 'pnj' | 'organisation'
  type        text        NOT NULL DEFAULT 'pnj' CHECK (type IN ('pj', 'pnj', 'organisation')),
  -- statut : 'vivant' | 'mort' | 'inconnu'
  statut      text        NOT NULL DEFAULT 'vivant' CHECK (statut IN ('vivant', 'mort', 'inconnu')),
  description text,
  -- URL d'image ou data URL (image redimensionnée côté client, ~160 px)
  image       text,
  -- Position sur le canevas (NULL = à placer automatiquement)
  pos_x       numeric,
  pos_y       numeric,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.graphe_liens (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id   uuid        NOT NULL REFERENCES public.graphe_personnages(id) ON DELETE CASCADE,
  cible_id    uuid        NOT NULL REFERENCES public.graphe_personnages(id) ON DELETE CASCADE,
  -- type : 'allie' | 'ennemi' | 'famille' | 'affaires' | 'neutre'
  type        text        NOT NULL DEFAULT 'neutre' CHECK (type IN ('allie', 'ennemi', 'famille', 'affaires', 'neutre')),
  libelle     text,
  description text,
  -- true = flèche de source vers cible ; false = lien réciproque
  oriente     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT graphe_liens_pas_de_boucle CHECK (source_id <> cible_id)
);

CREATE INDEX IF NOT EXISTS idx_graphe_liens_source ON public.graphe_liens(source_id);
CREATE INDEX IF NOT EXISTS idx_graphe_liens_cible  ON public.graphe_liens(cible_id);

DROP TRIGGER IF EXISTS trig_graphe_personnages_updated_at ON public.graphe_personnages;
CREATE TRIGGER trig_graphe_personnages_updated_at
  BEFORE UPDATE ON public.graphe_personnages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.graphe_personnages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graphe_liens       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_all" ON public.graphe_personnages;
DROP POLICY IF EXISTS "dev_all" ON public.graphe_liens;
CREATE POLICY "dev_all" ON public.graphe_personnages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON public.graphe_liens       FOR ALL USING (true) WITH CHECK (true);
