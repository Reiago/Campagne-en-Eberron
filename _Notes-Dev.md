Supabase : - Le plan gratuit limite à **3 emails par heure**.

Pour entrer des mots de passe directement sans passer par la procédure par mail :
la procédure est la même pour les joueurs ou MJ

```sql
UPDATE auth.users
SET encrypted_password = crypt('mot_de_passe_choisi', gen_salt('bf'))
WHERE email = 'email_du_joueur@example.com';
```

Notes pour le dévellopement uniquement :
- **auth.js** : toutes les fonctions retournent un faux utilisateur `{ id: 'dev-placeholder-uuid', email: 'dev@eberron.local' }` sans toucher Supabase. `isMJ` retourne toujours `true`.

**Important** : pour que `fiche.html` charge un personnage sans passer par `?id=`, remplace `'dev-placeholder-uuid'` dans [auth.js](auth.js) par le vrai `user_id` d'un personnage existant dans ta table `personnages` (Supabase → Table Editor → `personnages` → colonne `user_id`).

