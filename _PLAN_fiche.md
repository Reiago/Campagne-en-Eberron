# Plan d'implémentation — Fiches de personnage D&D

**Stack** : HTML / CSS / Vanilla JS · Supabase (Auth + DB) · GitHub Pages
**Approche** : 5 phases, des blocs essentiels vers les blocs avancés.

---

## Phase 0 — Fondations

### 0.1 Schéma Supabase (tables séparées)

- [x] Supprimer / remplacer le schéma de test actuel (`supabase_schema.sql`)
- [x] Créer la table `personnages` (données principales + tous les champs scalaires)
  - Identité : `nom`, `classe`, `niveau`, `race`, `age`, `taille_cm`, `poids_kg`, `dieu`, `devise`, `xp`, `alignement`
  - Déplacement : `vitesse_base_m`, `vitesse_nage_m`, `vitesse_escalade_m`, `vitesse_vol_m`
  - Armure : `type_armure`, `bonus_armure`, `bouclier`, `bonus_armure_magie`, `bonus_armure_autre`
  - PV : `type_de_vie`, `pv_max`, `pv_actuel`, `pv_temporaires`, `des_de_vie_depenses`, `jds_succes`, `jds_echecs`
  - Sorts : `caracteristique_incantation`
  - Divers : `inspiration`, `traits_raciaux`, `maitrises_langues`, `trait1`, `trait2`, `ideal`, `lien`, `defaut`, `historique`, `notes`
  - Clé étrangère : `user_id uuid FK → auth.users`
- [x] Créer la table `profils` (rôle MJ / joueur, liée à auth.users)
- [x] Créer la table `caracteristiques` (6 stats + maîtrises JdS)
  - `force`, `intelligence`, `sagesse`, `dexterite`, `constitution`, `charisme`
  - `maitrise_jds_*` (6 booléens, un par stat)
- [x] Créer la table `competences` (18 lignes par personnage)
  - `personnage_id`, `nom`, `maitrise boolean`, `expertise boolean`
- [x] Créer la table `armes`
  - `nom`, `caracteristique`, `maitrise`, `bonus_magie`, `bonus_special`, `de_degats`, `bonus_degats_special`, `type_degats`
- [x] Créer la table `emplacements_sorts` (niveaux 0 à 9)
  - `personnage_id`, `niveau_sort int`, `max_emplacements int`, `emplacements_utilises int`
- [x] Créer la table `sorts`
  - `nom`, `niveau_sort`, `prepare`, `temps_incantation`, `duree`, `portee`, `concentration`, `composante_v`, `composante_s`, `composante_m`, `description`
- [x] Créer la table `capacites`
  - `nom`, `max_utilisations`, `utilisations_actuelles`, `rechargement`, `action_requise`, `description`
- [x] Créer la table `equipement`
  - `nom`, `type` (equipement / possession / magique), `description`, `quantite`
- [x] Créer la table `monnaie`
  - `pp`, `po`, `pe`, `pa`, `pc`
- [x] Index sur toutes les clés étrangères + `user_id`
- [x] Trigger `updated_at` sur `personnages`
- [x] Trigger `init_personnage` : crée automatiquement les lignes enfants à chaque INSERT
- [x] Trigger `create_profil_on_signup` : crée un profil à l'inscription Auth
- [x] Policies RLS de développement (accès total `USING (true)`)
- [x] Policies RLS de production pré-écrites en commentaire (pour Phase 5)
- [x] Données de démonstration (3 personnages + caractéristiques + monnaie)
- [x] Créer `supabase_config.js` — module ES partagé exportant le client Supabase
- [x] **ACTION MANUELLE** — Exécuter `supabase_schema.sql` dans l'éditeur SQL Supabase
- [x] **ACTION MANUELLE** — Activer **Realtime** sur `personnages` : Database › Replication › Source Tables

### 0.2 Configuration Supabase Auth

- [x] **ACTION MANUELLE** — Activer le provider **Email/Password** : Authentication › Providers
- [x] **ACTION MANUELLE** — Désactiver la confirmation par email (tests) : Authentication › Providers › Supabase Auth > User Signups > Confirm email → OFF
- [x] **ACTION MANUELLE** — Authentication › URL Configuration : Site URL : https://reiago.github.io/Campagne-en-Eberron/
- [x] **ACTION MANUELLE** — Authentication › Redirect URLs → ajouter ces deux entrées (une pour la prod, une pour les tests en local) :
  - https://reiago.github.io/Campagne-en-Eberron/
  - http://localhost:8000/
- [x] **ACTION MANUELLE** — Créer le compte MJ via Authentication › Users › Invite
- [x] **ACTION MANUELLE** — Dans la table `profils`, passer `is_mj = true` pour le compte MJ
- [x] **ACTION MANUELLE** — Créer 2–3 comptes joueurs test via Authentication › Users › Invite
- [x] **ACTION MANUELLE** — Assigner les `user_id` des joueurs dans la table `personnages` (UPDATE)
  - [ ] **PROJET** - Si on souhaite exporter le projet pour d'autres personnes page à créer pour l'insertion du nouveau joueur 

---

## Phase 1 — Socle : Auth + Portail + Navigation

### 1.1 Fichiers de base

- [x] Créer `auth.js` — module d'authentification partagé
  - `login(email, password)` → redirige joueur vers fiche ou MJ vers page sélection
  - `logout()` → retour à `login.html`
  - `getCurrentUser()` → retourne l'utilisateur connecté
  - `isMJ(user)` → vérifie si l'utilisateur est le MJ (par email ou rôle en DB)
  - Chargement automatique de la session Supabase au démarrage
- [x] Créer `login.html` — page de connexion
  - Champ email + mot de passe
  - Bouton "Se connecter"
  - Message d'erreur si échec
  - Redirection automatique si déjà connecté
  - Style thème Eberron (cohérent avec `style.css`)
- [x] Créer `db.js` — module CRUD Supabase partagé
  - `getPersonnage(userId)` → charge la fiche du joueur connecté
  - `updatePersonnage(id, data)` → sauvegarde un champ ou bloc
  - `getArmes(personnageId)`, `updateArme(id, data)`, `addArme(data)`, `deleteArme(id)`
  - Même pattern pour `sorts`, `capacites`, `equipement`, `competences`

### 1.2 Portail (`index.html`)

- [x] Ajouter un lien **"Fiche de personnage"** dans la navigation principale (`nav.html`)
- [x] Protéger `index.html` : rediriger vers `login.html` si non connecté
- [ ] Afficher le nom du joueur connecté + bouton déconnexion dans la nav

### 1.3 Page sélection MJ

- [ ] Créer `mj.html` — accessible uniquement au MJ
  - Liste de tous les personnages en DB
  - Clic sur un personnage → ouvre `fiche.html?id=<uuid>`
  - Bouton retour au portail
- [ ] Redirection : si MJ → `mj.html` ; si joueur → `fiche.html` (sa propre fiche)

---

## Phase 2 — Fiches : Blocs essentiels

### 2.0 Layout de la fiche (`fiche.html` + `fiche.css`)

- [ ] Créer `fiche.html` avec structure de base
  - Barre de navigation des blocs (fixe en haut, pleine largeur)
  - Menu burger sur mobile pour les 12 blocs
  - Zone de contenu principale (`<main id="bloc-actif">`)
  - Pas de navigation globale du site sur cette page
- [ ] Créer `fiche.css` — styles spécifiques à la fiche
  - Compatible 16:9 mobile en priorité
  - Thème Eberron (gold / stone) cohérent avec le site
  - Cases à cocher stylisées
  - Boutons de lancer de dés
- [ ] Créer `fiche.js` — logique principale
  - Chargement de la fiche au démarrage (`getPersonnage`)
  - Système de navigation entre blocs (afficher/masquer les sections)
  - Sauvegarde automatique à chaque modification (debounce ~500ms)
  - Indicateur visuel "Sauvegarde en cours…" / "Sauvegardé ✓"

### 2.1 Moteur de calcul (`calculs.js`)

- [ ] `modificateur(valeur)` → `Math.floor((valeur - 10) / 2)`
- [ ] `bonusMaitrise(niveau)` → table des niveaux 1-20
- [ ] `caCalculee(typeArmure, bonusArmure, modDex, bouclier, magie, autre)`
- [ ] `pvMax(niveau, typeDe, modCon, pvBase)` → somme par niveau
- [ ] `bonusCompetence(nomCarac, valeurCarac, maitrise, expertise, niveau)`
- [ ] `perceptionPassive(modSagesse, maitrise, niveau)`
- [ ] `ddSorts(bonusMaitrise, modCaracIncantation)`
- [ ] `bonusAttaqueSorts(bonusMaitrise, modCaracIncantation)`
- [ ] `bonusToucher(modCarac, maitrise, bonusMagie, special, niveau)`
- [ ] `sautLongueur(valeurForce, avecElan)` → formule officielle
- [ ] `sautHauteur(modForce, avecElan)` → formule officielle
- [ ] `chargeMax(valeurForce)`

### 2.2 Système de lancer de dés (`des.js`)

- [ ] `lancerDe(nombreFaces)` → `Math.floor(Math.random() * faces) + 1`
- [ ] `lancerJet(modificateur, label)` → affiche popup/toast `"1d20 + mod = résultat"`
- [ ] Composant toast/popup de résultat (discret, disparaît après 3s)
- [ ] Ajouter un bouton 🎲 sur chaque jet clé de la fiche :
  - [ ] Jets de caractéristique (×6)
  - [ ] Jets de sauvegarde (×6)
  - [ ] Compétences (×18)
  - [ ] Attaque par arme (×N)
  - [ ] Initiative

### 2.3 Bloc 1 — Identité du personnage

- [ ] Afficher et rendre éditable : `nom`, `classe`, `niveau`, `race`, `âge`, `taille`, `poids`, `dieu`, `devise`, `xp`, `alignement`
- [ ] Sélecteur pour l'alignement (9 valeurs)
- [ ] Sauvegarde automatique à chaque modification

### 2.4 Bloc 2 — Caractéristiques

- [ ] Afficher les 6 cases de stat (valeur + modificateur calculé)
- [ ] Modifier la valeur → recalcul immédiat du modificateur
- [ ] Afficher le bonus de maîtrise (calculé selon `niveau`)
- [ ] 6 jets de sauvegarde avec case de maîtrise + valeur calculée + bouton 🎲
- [ ] Afficher l'Initiative (= mod. Dextérité)
- [ ] Recalcul en cascade si une stat change (compétences, CA, PV…)

### 2.5 Bloc 4 — Classe d'Armure

- [ ] Sélecteur type d'armure (sans / légère / intermédiaire / lourde)
- [ ] Champs : `bonus_armure`, `bouclier`, `magie`, `autre`
- [ ] CA totale calculée et mise en avant (grand nombre)
- [ ] Alerte si armure sans maîtrise (fonctionnalité optionnelle)

### 2.6 Bloc 5 — Points de Vie & Dés de Vie

- [ ] Sélecteur type de dé (d6 / d8 / d10 / d12)
- [ ] PV max calculé (niveau 1 : max dé + mod Con ; niveaux suivants : somme)
- [ ] PV actuel : champ numérique modifiable + boutons +/−
- [ ] Barre de progression PV actuel / PV max (couleur rouge/orange/vert)
- [ ] PV temporaires : champ numérique distinct
- [ ] Dés de vie restants : cases à cocher (nombre = niveau du personnage)
- [ ] Repos court : bouton → lance les dés de vie cochés, récupère PV
- [ ] Repos long : bouton → remet PV max, récupère la moitié des dés de vie
- [ ] 3 cases JDS succès + 3 cases JDS échecs
- [ ] Réinitialisation automatique des JDS après stabilisation/soin

### 2.7 Bloc 6 — Compétences

- [ ] 18 lignes : case maîtrise + case expertise + valeur calculée + bouton 🎲
- [ ] Valeur = mod. caractéristique + bonus maîtrise (si coché) ou ×2 (si expertise)
- [ ] Recalcul automatique si les stats changent
- [ ] Afficher la **Perception passive** (calculée) en bas du bloc
- [ ] Case **Inspiration** (booléen)

---

## Phase 3 — Fiches : Blocs intermédiaires

### 3.1 Bloc 3 — Déplacements & Charge

- [ ] Champs vitesses : base, nage, escalade, vol
- [ ] Calculs affichés en lecture seule :
  - [ ] Saut en longueur avec/sans élan
  - [ ] Saut en hauteur avec/sans élan
  - [ ] Charge maximum
- [ ] Section encombrement (optionnel) : poids porté → statut calculé

### 3.2 Bloc 7 — Armes

- [ ] Tableau dynamique avec bouton "Ajouter une arme"
- [ ] Par ligne : `nom`, `caractéristique` (sélecteur For/Dex), `maîtrise` (case), `bonus magie`, `bonus spécial`, `dé de dégâts`, `type de dégâts`
- [ ] Total toucher calculé + bouton 🎲
- [ ] Total dégâts calculé (dé + mod + magie + spécial)
- [ ] Bouton supprimer une ligne
- [ ] Sauvegarde en DB (table `armes`)

### 3.3 Bloc 8 — Équipement & Possessions

- [ ] Liste dynamique d'objets portés (ajout / suppression)
- [ ] Section monnaie : PP / PO / PE / PA / PC (champs numériques)
- [ ] Section objets magiques (nom + description)
- [ ] Sauvegarde en DB (tables `equipement`, `monnaie`)

---

## Phase 4 — Fiches : Blocs avancés

### 4.1 Bloc 9 — Sorts

- [ ] Sélecteur caractéristique d'incantation
- [ ] DD des sorts + bonus d'attaque de sort (calculés, affichés en haut)
- [ ] Pour chaque niveau de sort (0–9) :
  - [ ] Nombre d'emplacements (champ) + cases utilisés à cocher
  - [ ] Nombre de sorts préparés (champ)
- [ ] Tableau de sorts dynamique (ajout / suppression) avec :
  - [ ] `nom`, `niveau`, `préparé`, `temps d'incantation`, `durée`, `portée`
  - [ ] `concentration` (case), `composantes` V/S/M (cases)
  - [ ] `description` (texte long, dépliable)
- [ ] Sauvegarde en DB (tables `sorts`, `emplacements_sorts`)

### 4.2 Bloc 10 — Traits & Capacités

- [ ] Zone texte : traits raciaux / capacités de classe
- [ ] Zone texte : maîtrises & langues
- [ ] Tableau dynamique des capacités à utilisations limitées :
  - [ ] `nom`, `max`, `utilisé` (champ + cases), `rechargement`, `action`, `description`
  - [ ] Bouton "Utiliser" (−1) + reset au repos
- [ ] Sauvegarde en DB (table `capacites`)

### 4.3 Bloc 11 — Historique / Personnalité

- [ ] 5 zones texte : `trait 1`, `trait 2`, `idéal`, `lien`, `défaut`
- [ ] Zone texte : historique (background)
- [ ] Sauvegarde automatique

### 4.4 Bloc 12 — Notes

- [ ] Zone de texte libre (grande, multi-lignes)
- [ ] Sauvegarde automatique

---

## Phase 5 — Finalisation & Mise en production

### 5.1 Sécurité : activation du RLS Supabase

- [ ] Activer RLS sur toutes les tables
- [ ] Politique lecture/écriture joueurs : `auth.uid() = personnage.user_id`
- [ ] Politique lecture/écriture MJ : compte MJ identifié (par email ou rôle `is_mj` en DB)
- [ ] Tester que chaque joueur ne voit que sa fiche
- [ ] Tester que le MJ voit toutes les fiches
- [ ] Tester que la clé anon ne permet plus d'accès sans authentification

### 5.2 Tests & Qualité

- [ ] Tester l'affichage sur mobile (Chrome DevTools, format 16:9, 390×844)
- [ ] Tester sur tablette et desktop
- [ ] Vérifier les recalculs en cascade (changer une stat → tout se met à jour)
- [ ] Tester le lancer de dés sur tous les jets
- [ ] Tester le repos court et repos long (PV, dés de vie)
- [ ] Tester la sauvegarde automatique (coupure réseau, reconnexion)
- [ ] Tester la navigation entre blocs sur mobile (menu burger)
- [ ] Tester le flux complet : login → fiche → modification → déconnexion

### 5.3 Optimisations finales

- [ ] Ajouter un indicateur de chargement initial de la fiche
- [ ] Gérer les erreurs Supabase (afficher message en cas d'échec de sauvegarde)
- [ ] Optimiser les requêtes : charger tous les blocs en parallèle au démarrage
- [ ] Ajouter un favicon au site
- [ ] Mettre à jour le `README.md` avec les instructions de connexion pour les joueurs

---

## Récapitulatif des fichiers à créer

| Fichier | Description |
|---|---|
| `supabase_schema.sql` | Schéma DB complet (remplace l'actuel) |
| `login.html` | Page de connexion |
| `auth.js` | Module authentification |
| `db.js` | Module CRUD Supabase |
| `calculs.js` | Moteur de calcul D&D 5e |
| `des.js` | Lancer de dés + composant toast |
| `fiche.html` | Page fiche de personnage (12 blocs) |
| `fiche.css` | Styles de la fiche (mobile-first) |
| `fiche.js` | Logique principale de la fiche |
| `mj.html` | Page sélection personnage (MJ) |
