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

## UI — pas de pop-up natives

- Ne jamais utiliser `alert()`, `confirm()` ou `prompt()` (peu fiables sur certains navigateurs, ex. Arc).
- Utiliser à la place une fenêtre modale HTML/CSS custom, sur le pattern déjà en place dans [races-classes-base.html](races-classes-base.html:150) (`.modal-overlay` / `.modal-box`) et repris dans [equipement-base.html](equipement-base.html:148) pour les modales d'information.

## Supabase local — hébergé sur le serveur Ubuntu

- Le Supabase de dev ne tourne **plus dans Docker sur ce poste** : il est hébergé sur un serveur Ubuntu du réseau local, toujours allumé.
  - API : `http://192.168.0.25:54321` (utilisée par [supabase_config.js](supabase_config.js) quand la page est servie en local)
  - Studio / éditeur SQL : `http://192.168.0.25:54323`
- **Ne pas** lancer `npx supabase start`/`stop` ni chercher un conteneur Docker local : il n'y a rien à démarrer ici.
- Si l'API ne répond pas, le signaler à l'utilisateur plutôt que d'essayer de la relancer.
