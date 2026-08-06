# Instructions pour Claude

## Supabase — Modifications de schéma

Quand une modification du fichier `supabase_schema.sql` ajoute ou change une colonne dans une table existante, **toujours signaler explicitement** à l'utilisateur qu'il doit exécuter un `ALTER TABLE` dans l'éditeur SQL de Supabase.

- Le fichier `supabase_schema.sql` est une référence documentaire (état cible), **pas un script à ré-exécuter entièrement**.
- Fournir la commande exacte à copier-coller, par exemple :
  ```sql
  ALTER TABLE nom_table
    ADD COLUMN nouvelle_colonne jsonb NOT NULL DEFAULT '[]';
  ```
- Ne pas supposer que l'utilisateur a vu la note dans le schéma SQL — le signaler clairement dans la réponse en texte.

## Test des modification de la fiche de personnage

- Utilise la fiche suivante pour visualiser les modifications :
fiche.html?id=4e43894d-731a-4ec7-babc-22ce9c49e34a

## Supabase local — ne jamais l'arrêter sans raison

- Avant de lancer `npx supabase start`/`stop` pour tester, vérifier s'il tourne déjà (`docker ps --filter "name=Campagne-en-Eberron"`).
- Si le stack Supabase local était **déjà lancé** avant l'intervention, **ne jamais l'arrêter** (`npx supabase stop`) à la fin des tests — le laisser tourner tel quel.
- Ne l'arrêter que s'il a été démarré spécifiquement pour ce test (c'est-à-dire qu'il était éteint avant).
