Supabase : - Le plan gratuit limite à **3 emails par heure**.

Pour entrer des mots de passe directement sans passer par la procédure par mail :
la procédure est la même pour les joueurs ou MJ

```sql
UPDATE auth.users
SET encrypted_password = crypt('mot_de_passe_choisi', gen_salt('bf'))
WHERE email = 'email_du_joueur@example.com';
```
