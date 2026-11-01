-- ============================================================
-- Instantanés du graphe des relations (page relations.html)
-- Un instantané fige l'état complet de la toile (personnages et liens,
-- positions et images comprises) pour pouvoir le consulter plus tard,
-- en lecture seule, à côté de la version actuelle.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.graphe_instantanes (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  libelle     text        NOT NULL,
  -- Copie des lignes de graphe_personnages / graphe_liens au moment de la prise
  nodes       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  links       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.graphe_instantanes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_all" ON public.graphe_instantanes;
CREATE POLICY "dev_all" ON public.graphe_instantanes FOR ALL USING (true) WITH CHECK (true);
