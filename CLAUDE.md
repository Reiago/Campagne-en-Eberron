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
