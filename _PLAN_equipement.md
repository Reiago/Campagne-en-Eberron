# Refonte de la gestion de l'équipement — Plan d'implémentation

## Contexte

La gestion actuelle de l'équipement (table `equipement` simple : nom, type fixe en dropdown, quantité, poids, description) ne permet pas de retrouver facilement un objet dans un inventaire qui s'allonge, ne porte aucune information de valeur, et ne distingue pas les objets "officiels" des objets custom des joueurs. L'objectif est de remplacer le champ `type` rigide par un système de tags multiples, d'introduire une base d'objets officielle gérée par le MJ (avec import CSV), de stocker la valeur des objets, et de transformer la monnaie elle-même en objets d'équipement tagués — tout en gardant l'inventaire utilisable via tri/filtres quand il grossit.

Décisions de conception validées avec l'utilisateur :
- La table `monnaie` dédiée est **supprimée entièrement** ; la monnaie devient des objets d'équipement tagués "Monnaie", valeur en PC (1 PP = 1000 PC, 1 PO = 100 PC, 1 PE = 50 PC, 1 PA = 10 PC).
- Les objets dans un tag-conteneur (ex. "Bourse") comptent **normalement** dans le poids total (aucune exonération), seul le regroupement visuel change.
- L'action "Personnaliser" produit une copie **totalement indépendante** (pas de référence à l'objet officiel d'origine), et supprime l'original en une seule action.
- Import CSV : colonnes `nom, valeur_pc, poids, tags, description` ; détection de doublons sur nom normalisé (casse/accents ignorés).

Point à signaler : transformer la monnaie en objets tagués implique que le résumé PP/PO/PE/PA/PC affiché devient calculé/lecture-seule (il n'y a plus de champ numérique éditable directement) — l'édition se fera via ajout/modification d'objets "Monnaie". C'est un changement de comportement par rapport à l'existant (actuellement toujours éditable, même en mode jeu), assumé comme conséquence du choix de tout migrer vers les tags.

## 1. Modèle de données

### 1.1 Nouvelle table `tags`
```sql
CREATE TABLE tags (
  id                      uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  personnage_id           uuid        NOT NULL REFERENCES personnages(id) ON DELETE CASCADE,
  nom                     text        NOT NULL,
  systeme                 text,       -- 'monnaie' | 'equipe' | 'base' | NULL (tag libre)
  conteneur_equipement_id uuid        REFERENCES equipement(id) ON DELETE CASCADE,
  ordre                   int         NOT NULL DEFAULT 0,
  created_at              timestamptz DEFAULT now()
);
CREATE INDEX idx_tags_pid ON tags(personnage_id);
CREATE INDEX idx_tags_conteneur ON tags(conteneur_equipement_id);
```
Pas de contrainte `UNIQUE(personnage_id, nom)` : plusieurs tags-conteneurs homonymes doivent pouvoir coexister (ex. deux "Bourse" différentes) — désambiguïsation `#n` calculée côté front (section 3.3).

### 1.2 Table de liaison `equipement_tags`
```sql
CREATE TABLE equipement_tags (
  equipement_id uuid NOT NULL REFERENCES equipement(id) ON DELETE CASCADE,
  tag_id        uuid NOT NULL REFERENCES tags(id)       ON DELETE CASCADE,
  PRIMARY KEY (equipement_id, tag_id)
);
CREATE INDEX idx_equipement_tags_tag ON equipement_tags(tag_id);
```

### 1.3 Modification de `equipement`
```sql
ALTER TABLE equipement
  ADD COLUMN valeur_pc int NOT NULL DEFAULT 0,
  ADD COLUMN base_id   uuid REFERENCES equipement_base(id) ON DELETE SET NULL;

-- après migration des données (section 2) :
ALTER TABLE equipement DROP COLUMN type;
```
Le champ `type` (equipement/possession/magique) est entièrement remplacé par les tags. Schéma final : `id, personnage_id, nom, description, quantite, poids, valeur_pc, base_id, ordre, created_at`.

### 1.4 Trigger de cascade conteneur → contenu
```sql
CREATE OR REPLACE FUNCTION cascade_delete_conteneur()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM equipement
  WHERE id IN (
    SELECT et.equipement_id FROM equipement_tags et
    JOIN tags t ON t.id = et.tag_id
    WHERE t.conteneur_equipement_id = OLD.id
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_cascade_conteneur
  BEFORE DELETE ON equipement
  FOR EACH ROW EXECUTE FUNCTION cascade_delete_conteneur();
```

### 1.5 Nouvelle table `equipement_base` (catalogue officiel MJ)
```sql
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
```
`nom_normalise` calculé côté JS (minuscule, accents retirés) pour éviter une dépendance à l'extension `unaccent`. `tags text[]` : convertis en tags personnels du joueur (créés si absents) lors de l'import sur sa fiche.

### 1.6 Policies de production (bloc commenté du schéma)
```sql
CREATE POLICY "prod_equipement_base_select" ON equipement_base FOR SELECT USING (true);
CREATE POLICY "prod_equipement_base_write"  ON equipement_base FOR INSERT WITH CHECK (is_mj());
CREATE POLICY "prod_equipement_base_update" ON equipement_base FOR UPDATE USING (is_mj());
CREATE POLICY "prod_equipement_base_delete" ON equipement_base FOR DELETE USING (is_mj());

CREATE POLICY "prod_tags" ON tags FOR ALL USING (
  EXISTS (SELECT 1 FROM personnages p WHERE p.id = personnage_id AND (p.user_id = auth.uid() OR is_mj()))
);
CREATE POLICY "prod_equipement_tags" ON equipement_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM equipement e JOIN personnages p ON p.id = e.personnage_id
          WHERE e.id = equipement_id AND (p.user_id = auth.uid() OR is_mj()))
);
```

### 1.7 `init_personnage()`
Retirer l'insertion dans `monnaie` du trigger d'initialisation — un personnage neuf démarre sans objet "Monnaie" tagué.

**Rappel CLAUDE.md** : chaque `ALTER`/`CREATE`/`DROP` ci-dessus doit être communiqué explicitement comme commande à exécuter manuellement dans l'éditeur SQL Supabase, en parallèle de la mise à jour de `supabase_schema.sql` comme documentation.

## 2. Migration monnaie → objets équipement
```sql
-- 1. Tag système "Monnaie" par personnage concerné
INSERT INTO tags (personnage_id, nom, systeme)
SELECT DISTINCT personnage_id, 'Monnaie', 'monnaie'
FROM monnaie WHERE pp > 0 OR po > 0 OR pe > 0 OR pa > 0 OR pc > 0;

-- 2. Un objet par dénomination non nulle (taux en PC : pp=1000, po=100, pe=50, pa=10, pc=1)
WITH denominations AS (
  SELECT personnage_id, 'Pièces de platine'  AS nom, pp AS quantite, 1000 AS taux FROM monnaie WHERE pp > 0
  UNION ALL SELECT personnage_id, 'Pièces d''or',       po, 100 FROM monnaie WHERE po > 0
  UNION ALL SELECT personnage_id, 'Pièces d''électrum', pe, 50  FROM monnaie WHERE pe > 0
  UNION ALL SELECT personnage_id, 'Pièces d''argent',   pa, 10  FROM monnaie WHERE pa > 0
  UNION ALL SELECT personnage_id, 'Pièces de cuivre',   pc, 1   FROM monnaie WHERE pc > 0
)
INSERT INTO equipement (personnage_id, nom, quantite, valeur_pc, ordre)
SELECT personnage_id, nom, quantite, taux, 0 FROM denominations;

-- 3. Lier ces objets au tag Monnaie du même personnage
INSERT INTO equipement_tags (equipement_id, tag_id)
SELECT e.id, t.id FROM equipement e
JOIN tags t ON t.personnage_id = e.personnage_id AND t.systeme = 'monnaie'
WHERE e.nom LIKE 'Pièces d%' AND e.created_at >= now() - interval '5 minutes';

-- 4. Vérification manuelle avant le DROP : comparer somme(valeur_pc * quantite) par personnage
--    avec l'ancien total en PC.

-- 5. IRRÉVERSIBLE — uniquement après vérification :
DROP TABLE monnaie CASCADE;
```
Convention pour tout futur ajout de monnaie : un objet par dénomination, `quantite` = nombre de pièces, `valeur_pc` = taux unitaire (pas la valeur totale).

## 3. Logique de calcul et d'affichage

**Résumé monnaie** (calculé côté front à chaque rendu) : filtrer les objets tagués "Monnaie", total PC = Σ(quantité × valeur_pc), puis décomposition en cascade pp → po → pe → pa → pc (division entière par 1000/100/50/10/1).

**Valeur affichée d'un objet** : même décomposition appliquée à `valeur_pc` de l'objet (ex. "2 po 5 pa").

**Numérotation `#n`** : purement front — grouper les tags-conteneurs par nom strict, trier par `ordre`/`created_at`, suffixe = index (base 1) dans le groupe, affiché seulement si le groupe a plus d'un élément. Jamais stocké en DB.

**Regroupement visuel conteneur** : objets liés à un tag-conteneur rattachés visuellement sous la carte du conteneur ; le tri/filtre s'applique avant le regroupement.

## 4. Page MJ — Base officielle

Nouvelle page `equipement-base.html` (+ JS dédié), protégée par `requireMJ()` (même pattern que `mj.html`), lien ajouté depuis `mj.html`.

UI : tableau CRUD du catalogue (nom, valeur formatée, poids, tags, description) + formulaire d'ajout manuel + zone d'import CSV (colonnes `nom, valeur_pc, poids, tags, description`, tags séparés par `;`). Parsing simple côté client (PapaParse via CDN si guillemets/virgules échappées nécessaires). Pour chaque ligne : calcul `nom_normalise`, comparaison aux entrées existantes et aux autres lignes du même import → récapitulatif avant import (nouveaux vs doublons, case à cocher importer/ignorer/remplacer), confirmation explicite déclenche les inserts/upserts en lot.

Fonctions `db.js` à ajouter : `getEquipementBase()`, `searchEquipementBase(query)`, `addEquipementBase(data)`, `updateEquipementBase(id, data)`, `deleteEquipementBase(id)`, `bulkUpsertEquipementBase(rows)`.

## 5. UI joueur (fiche.html / fiche.js / fiche.css)

- **Suppression du champ Type** : retirer le `<select>` (fiche.js ~789-796), `card.dataset.type` et la règle CSS `[data-type="magique"]` (fiche.css ~772, 882-885) — remplacés par une classe posée si l'objet porte le tag "Magique".
- **Tags par carte objet** : puces des tags existants + bouton "+ tag" (tags déjà créés sur le perso + champ de création). Tag-conteneur via option "Faire de cet objet un conteneur". Fonctions `db.js` : `getTags`, `addTag`, `deleteTag`, `getEquipementTags`, `linkTag`, `unlinkTag`.
- **Recherche base officielle** : le bouton "+ Ajouter un objet" (fiche.js ~753) ouvre une recherche (`searchEquipementBase`) au lieu de créer un objet vide ; sélection → pré-remplit nom/valeur/poids/description, pose `base_id` + tag "Base" + tags suggérés (création des tags manquants à la volée). Option "Créer un objet personnalisé" conservée.
- **Filtres et tris** : barre d'outils au-dessus de l'inventaire (A-Z/Z-A, valeur croissant/décroissant, poids croissant/décroissant, filtre multi-tag), état local en mémoire, pas de persistance DB (localStorage optionnel).
- **Menu contextuel** remplaçant la croix de suppression (fiche.js ~797) : Supprimer (comme l'actuel `deleteEquipement`, en tenant compte de la cascade conteneur côté DB) / Personnaliser (visible si tag "Base" : duplique sans `base_id` ni tag "Base", supprime l'original — deux appels séquentiels, pas de RPC transactionnelle) / Dupliquer (toujours visible, copie indépendante sans statut conteneur même si l'original en était un).
- **Résumé monnaie** : section lecture-seule (remplace fiche.html ~428-458) affichant les 5 valeurs calculées + raccourci "+ Ajouter de la monnaie" (dénomination + quantité, crée/incrémente l'objet correspondant). Suppression de `remplirMonnaie`/`scheduleMonnaie` et de toute référence à `monnaie`/`getMonnaie`/`updateMonnaie`.

## 6. Découpage en phases

1. **Modèle de données + migration monnaie** (bloquante pour tout le reste) — création tables, migration, `DROP TABLE monnaie`, retouche minimale de `fiche.js` pour ne plus appeler `getMonnaie`/`updateMonnaie` avant le drop.
2. **Tags de base + UI tags sur objets** — suppression du champ Type, zone tags par carte (sans conteneur/Base), résumé monnaie en lecture seule.
3. **Base officielle + import CSV + recherche joueur** — `equipement-base.html`, fonctions `db.js`, recherche/pré-remplissage côté joueur.
4. **Conteneurs + numérotation** — trigger SQL cascade, UI tag-conteneur, suffixe `#n`, regroupement visuel.
5. **Filtres/tris + menu contextuel** — barre d'outils, menu Supprimer/Personnaliser/Dupliquer.

## 7. Fichiers à modifier

- [supabase_schema.sql](supabase_schema.sql) — doc cible : nouvelles tables, colonnes, suppression `type`/`monnaie`, trigger, policies.
- [db.js](db.js) — fonctions tags + base officielle, suppression `getMonnaie`/`updateMonnaie`, adaptation `addEquipement`/`updateEquipement`.
- [fiche.js](fiche.js) — refonte `remplirEquipement`/`renderEquipementCard`, suppression logique monnaie dédiée, ajout calcul résumé/numérotation/recherche base.
- [fiche.html](fiche.html) — résumé monnaie lecture-seule, barre d'outils tri/filtre.
- [fiche.css](fiche.css) — styles tags, menu contextuel, regroupement conteneur, suppression règle `[data-type="magique"]`.
- [mj.html](mj.html) — lien vers la nouvelle page.
- `equipement-base.html` + `equipement-base.js` (nouveaux) — page MJ catalogue officiel + import CSV.

## 8. Plan de vérification

Test manuel sur `fiche.html?id=4e43894d-731a-4ec7-babc-22ce9c49e34a`, en mode édition ET mode jeu :

- **Phase 1** : somme migrée (quantité × valeur_pc) des objets "Monnaie" = ancien total PC ; pas d'erreur console après le `DROP`.
- **Phase 2** : ajout/retrait de tag persiste après reload ; champ Type disparu ; résumé monnaie correct après ajout manuel.
- **Phase 3** : import CSV avec doublons (variations casse/accents) correctement détectés et listés avant confirmation ; recherche côté joueur pré-remplit correctement (nom, valeur, poids, description, tags, `base_id`, tag "Base").
- **Phase 4** : créer 2 conteneurs "Bourse" homonymes avec contenu chacun → affichage `#1`/`#2` corrects et indépendants ; suppression de "Bourse #1" supprime son contenu (cascade) sans affecter "Bourse #2" ; poids total inclut bien les objets en conteneur.
- **Phase 5** : chaque tri (A-Z/Z-A/valeur/poids) ; filtre par tag ; "Personnaliser" sur objet Base produit une copie sans tag Base ni `base_id` et supprime l'original ; "Dupliquer" copie sans suppression et sans héritage du statut conteneur ; "Supprimer" via le menu reproduit le comportement actuel (cascade incluse).
