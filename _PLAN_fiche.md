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
- [x] Afficher le nom du joueur connecté + bouton déconnexion dans la nav

### 1.3 Page sélection MJ

- [x] Créer `mj.html` — accessible uniquement au MJ
  - Liste de tous les personnages en DB
  - Clic sur un personnage → ouvre `fiche.html?id=<uuid>`
  - Bouton retour au portail
- [x] Redirection : si MJ → `mj.html` ; si joueur → `fiche.html` (sa propre fiche)

---

## Phase 2 — Fiches : Blocs essentiels

### 2.0 Modes d'affichage — Mode Jeu / Mode Édition

> Fonctionnalité transversale : tous les blocs de la fiche doivent respecter ces deux modes.

- [x] Ajouter un bouton bascule **Mode Jeu / Mode Édition** dans la barre de navigation des blocs (visible en permanence)
- [x] Le mode actif est stocké dans `localStorage` (persisté entre sessions)
- [x] La fiche démarre en **Mode Jeu** par défaut
- [x] Appliquer une classe CSS globale (`mode-jeu` / `mode-edition`) sur `<body>` ou `<main>` pour piloter l'apparence par CSS

**Mode Jeu (lecture + jets de dés)**
- [x] Tous les champs éditables (`input`, `select`, `textarea`) deviennent non-éditables (`readonly` / `disabled` / remplacés par du texte brut)
- [x] Un clic sur n'importe quelle valeur numérique associée à un jet déclenche directement le jet de dé (modificateur, compétence, JdS, attaque…)
- [x] Les boutons 🎲 sont masqués (le clic sur la valeur les remplace)
- [x] Les boutons d'action structurelle sont masqués (ajouter/supprimer arme, sort, capacité…)
- [x] Les boutons de repos court / repos long restent accessibles
- [x] Visuel distinctif : fond légèrement différent ou bandeau coloré indiquant le mode actif

**Mode Édition (saisie libre)**
- [x] Comportement actuel : tous les champs sont éditables
- [x] feat. supprimée : Les boutons 🎲 sont affichés à côté des valeurs
- [x] Les boutons d'action structurelle sont affichés (ajouter/supprimer…)
- [x] Sauvegarde automatique active (debounce)

**Règle générale — valeurs calculées**
- [x] Les champs calculés (modificateurs, CA totale, bonus de maîtrise, perception passive, DD sorts, bonus attaque sorts, bonus toucher…) ne sont **jamais** éditables, quel que soit le mode
- [x] Ils sont affichés en lecture seule avec un style visuel distinct (ex. couleur ou fond différent)
- [x] En mode jeu, un clic sur une valeur calculée liée à un jet déclenche tout de même le dé

**Implémentation dans `fiche.js`**
- [x] Fonction `setMode(mode)` → applique la classe CSS, met à jour le bouton, sauvegarde dans `localStorage`
- [x] Fonction `getMode()` → lit `localStorage`, retourne `'jeu'` ou `'edition'`
- [x] Au chargement, appeler `setMode(getMode())` pour restaurer le dernier mode
- [x] Les gestionnaires de clic sur les valeurs numériques vérifient le mode avant d'agir (jet ou édition)

---

### 2.0b Layout de la fiche (`fiche.html` + `fiche.css`)

- [x] Créer `fiche.html` avec structure de base
  - Barre de navigation des blocs (fixe en haut, pleine largeur)
  - **Bouton bascule Mode Jeu / Mode Édition dans la barre de navigation**
  - Menu burger sur mobile pour les 12 blocs
  - Zone de contenu principale (`<main id="bloc-actif">`)
  - Pas de navigation globale du site sur cette page
- [x] Créer `fiche.css` — styles spécifiques à la fiche
  - Compatible 16:9 mobile en priorité
  - Thème Eberron (gold / stone) cohérent avec le site
  - Cases à cocher stylisées
  - Boutons de lancer de dés
- [x] Créer `fiche.js` — logique principale
  - Chargement de la fiche au démarrage (`getPersonnage`)
  - Système de navigation entre blocs (afficher/masquer les sections)
  - Sauvegarde automatique à chaque modification (debounce ~500ms)
  - Indicateur visuel "Sauvegarde en cours…" / "Sauvegardé ✓"
  - **Gestion des modes Jeu / Édition (voir 2.0)**

### 2.1 Moteur de calcul (`calculs.js`)

- [x] `modificateur(valeur)` → `Math.floor((valeur - 10) / 2)`
- [x] `bonusMaitrise(niveau)` → table des niveaux 1-20
- [x] `caCalculee(typeArmure, bonusArmure, modDex, bouclier, magie, autre)`
- [x] `pvMax(niveau, typeDe, modCon, pvBase)` → somme par niveau
- [x] `bonusCompetence(nomCarac, valeurCarac, maitrise, expertise, niveau)`
- [x] `perceptionPassive(modSagesse, maitrise, niveau)`
- [ ] `ddSorts(bonusMaitrise, modCaracIncantation)`
- [x] `bonusAttaqueSorts(bonusMaitrise, modCaracIncantation)`
- [x] `bonusToucher(modCarac, maitrise, bonusMagie, special, niveau)`
- [x] `sautLongueur(valeurForce, avecElan)` → formule officielle
- [x] `sautHauteur(modForce, avecElan)` → formule officielle
- [x] `chargeMax(valeurForce)`

### 2.2 Système de lancer de dés (`des.js`)

- [x] `lancerDe(nombreFaces)` → `Math.floor(Math.random() * faces) + 1`
- [x] `lancerJet(modificateur, label)` → affiche popup/toast `"1d20 + mod = résultat"`
- [x] Composant toast/popup de résultat (discret, disparaît après 3s)
- [x] Ajouter un bouton 🎲 sur chaque jet clé de la fiche :
  - [x] Jets de caractéristique (×6)
  - [x] Jets de sauvegarde (×6)
  - [x] Compétences (×18)
  - [x] Attaque par arme (×N)
  - [x] Initiative
- [x] **Mode Jeu** : boutons 🎲 masqués — le clic sur la valeur numérique déclenche directement `lancerJet`
- [x] **Mode Édition** : caduque boutons supprimés : boutons 🎲 visibles, clic sur valeur → édition normale

### 2.3 Bloc 1 — Identité du personnage

- [x] Afficher et rendre éditable : `nom`, `classe`, `niveau`, `race`, `âge`, `taille`, `poids`, `dieu`, `devise`, `xp`, `alignement`
- [x] Sélecteur pour l'alignement (9 valeurs)
- [x] Sauvegarde automatique à chaque modification
- [x] **Mode Jeu** : tous les champs en lecture seule

### 2.4 Bloc 2 — Caractéristiques

- [x] Afficher les 6 cases de stat (valeur + modificateur calculé)
- [x] Modifier la valeur → recalcul immédiat du modificateur
- [x] Afficher le bonus de maîtrise (calculé selon `niveau`)
- [x] 6 jets de sauvegarde avec case de maîtrise + valeur calculée + bouton 🎲
- [x] Afficher l'Initiative (= mod. Dextérité)
- [x] Recalcul en cascade si une stat change (compétences, CA, PV…)
- [x] **Mode Jeu** : valeurs de stat éditables → lecture seule ; modificateurs (calculés) → clic lance le jet de caractéristique ; JdS calculés → clic lance le JdS ; cases de maîtrise JdS non modifiables
- [x] **Toujours en lecture seule** : modificateurs, bonus de maîtrise, valeur initiative (calculés)

### 2.5 Bloc 4 — Classe d'Armure

- [x] Sélecteur type d'armure (sans / légère / intermédiaire / lourde)
- [x] Champs : `bonus_armure`, `bouclier`, `magie`, `autre`
- [x] CA totale calculée et mise en avant (grand nombre)
- [ ] Alerte si armure sans maîtrise (fonctionnalité optionnelle)
- [x] **Mode Jeu** : champs bonus → lecture seule
- [x] **Toujours en lecture seule** : CA totale (calculée)

### 2.6 Bloc 5 — Points de Vie & Dés de Vie

- [x] Sélecteur type de dé (d6 / d8 / d10 / d12)
- [x] PV max calculé (niveau 1 : max dé + mod Con ; niveaux suivants : somme)
- [x] PV actuel : champ numérique modifiable + boutons +/−
- [x] Barre de progression PV actuel / PV max (couleur rouge/orange/vert)
- [x] PV temporaires : champ numérique distinct
- [x] Dés de vie restants : cases à cocher (nombre = niveau du personnage)
- [x] Repos court : bouton → lance les dés de vie cochés, récupère PV
- [x] Repos long : bouton → remet PV max, récupère la moitié des dés de vie
- [x] 3 cases JDS succès + 3 cases JDS échecs
- [x] Réinitialisation automatique des JDS après stabilisation/soin
- [x] **Mode Jeu** : PV actuel, PV temporaires, dés de vie, JdS restent interactifs (c'est de la gestion en temps réel) ; sélecteur type de dé → lecture seule
- [x] **Toujours en lecture seule** : PV max (calculé)

### 2.7 Bloc 6 — Compétences

- [x] 18 lignes : case maîtrise + case expertise + valeur calculée + bouton 🎲
- [x] Valeur = mod. caractéristique + bonus maîtrise (si coché) ou ×2 (si expertise)
- [x] Recalcul automatique si les stats changent
- [x] Afficher la **Perception passive** (calculée) en bas du bloc
- [x] Case **Inspiration** (booléen)
- [x] **Mode Jeu** : cases maîtrise/expertise non modifiables ; clic sur la valeur → jet de compétence direct ; boutons 🎲 masqués ; case Inspiration reste cliquable
- [x] **Toujours en lecture seule** : valeurs de compétences et perception passive (calculées)

---

## Phase 3 — Fiches : Blocs intermédiaires

### 3.1 Bloc 3 — Déplacements & Charge

- [x] Champs vitesses : base, nage, escalade, vol
- [x] Calculs affichés en lecture seule :
  - [x] Saut en longueur avec/sans élan
  - [x] Saut en hauteur avec/sans élan
  - [x] Charge maximum
- [ ] Section encombrement (optionnel) : poids porté → statut calculé (différé)

### 3.2 Bloc 7 — Armes

- [x] Tableau dynamique avec bouton "Ajouter une arme"
- [x] Par ligne : `nom`, `caractéristique` (sélecteur For/Dex), `maîtrise` (case), `bonus magie`, `bonus spécial`, `dé de dégâts`, `type de dégâts`
- [x] Total toucher calculé + bouton 🎲
- [x] Total dégâts calculé (dé + mod + magie + spécial)
- [x] Bouton supprimer une ligne
- [x] Sauvegarde en DB (table `armes`)
- [x] **Mode Jeu** : champs de saisie → lecture seule ; boutons ajouter/supprimer masqués ; clic sur total toucher → jet d'attaque ; clic sur total dégâts → jet de dégâts
- [x] **Toujours en lecture seule** : totaux toucher et dégâts (calculés)

### 3.3 Bloc 8 — Équipement & Possessions

- [x] Liste dynamique d'objets portés (ajout / suppression)
- [x] Section monnaie : PP / PO / PE / PA / PC (champs numériques)
- [x] Section objets magiques (nom + description, bordure dorée)
- [x] Sauvegarde en DB (tables `equipement`, `monnaie`)
- [x] **Mode Jeu** : liste objets → lecture seule, boutons ajouter/supprimer masqués ; monnaie reste éditable (gestion en temps réel)

---

## Phase 4 — Fiches : Blocs avancés

### 4.1 Bloc 9 — Sorts

- [x] Sélecteur caractéristique d'incantation
- [x] DD des sorts + bonus d'attaque de sort (calculés, affichés en haut)
- [x] Pour chaque niveau de sort (0–9) :
  - [x] Nombre d'emplacements (champ) + cases utilisés à cocher
  - [x] Nombre de sorts préparés (champ)
- [x] Tableau de sorts dynamique (ajout / suppression) avec :
  - [x] `nom`, `niveau`, `préparé`, `temps d'incantation`, `durée`, `portée`
  - [x] `concentration` (case), `composantes` V/S/M (cases)
  - [x] `description` (texte long, dépliable)
- [x] Sauvegarde en DB (tables `sorts`, `emplacements_sorts`)
- [x] **Mode Jeu** : champs sorts → lecture seule ; boutons ajouter/supprimer masqués ; cases emplacements utilisés restent cliquables (gestion en temps réel) ; cases `préparé` restent cliquables
- [x] **Toujours en lecture seule** : DD sorts et bonus attaque de sort (calculés)

### 4.2 Bloc 10 — Traits & Capacités

- [x] Zone texte : traits raciaux / capacités de classe
- [x] Zone texte : maîtrises & langues
- [x] Tableau dynamique des capacités à utilisations limitées :
  - [x] `nom`, `max`, `utilisé` (champ + cases), `rechargement`, `action`, `description`
  - [x] Bouton "Utiliser" (−1) + reset au repos
- [x] Sauvegarde en DB (table `capacites`)
- [x] **Mode Jeu** : zones texte → lecture seule ; boutons ajouter/supprimer capacités masqués ; bouton "Utiliser" et cases utilisations restent actifs

### 4.3 Bloc 11 — Historique / Personnalité

- [x] 5 zones texte : `trait 1`, `trait 2`, `idéal`, `lien`, `défaut`
- [x] Zone texte : historique (background)
- [x] Sauvegarde automatique
- [x] **Mode Jeu** : toutes les zones → lecture seule

### 4.4 Bloc 12 — Notes

- [x] Zone de texte libre (grande, multi-lignes)
- [x] Sauvegarde automatique
- [x] **Mode Jeu** : zone notes reste éditable (les notes en cours de session sont une exception justifiée)

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

## Développement futur

- [ ] Possibilité d'avoir des themes différents et de pouvoir switch dans les options du profil de l'utilisateur
- [ ] Log des lancés de dés
- [ ] Envois de message au MJ
- [ ] Sortie papier de la fiche du joueur
- [ ] Importer la liste des objets officiele
- [ ] Importer la liste des armes officiele
- [ ] Importer la liste des armures officiele
- [ ] Equipement, affichage de base n'afficher que le titre et la quantité sur un ligne quand l'utilisateur clic sur la ligne on la déplie pour afficher toute la fiche
- [ ] Equipement, ajouter la cararctérisque Emplacement : désignant ou se trouve l'objet actuellement, liste déroulante avec une liste de lieu éditable. Cela peut etre un lien plus ou moins précis : Maison de Thor, Ceinture de Jacob, Main droite de Jacob ...