---

## Blocs d'information de la fiche de personnage D&D

---
# Objectif - Fiches de personnage pour D&D consultable et modifiable en ligne
- Hébergement sur Github pages, https://github.com/Reiago/Campagne-en-Eberron
- Base de donnée sur Supabase, nom de la base 'Eberron_Project'
	- Une page de test a été configurée 'test_supabase.html' test OK
- Interface pour PC, Téléphone
- Les fiches de personnage sont la première pierre du site prévoir un portail pour accéder à d'autre service. Cartes, images, compte rendu etc ...
- La page index.html doit servir de portail.
- Pour se connecter à leurs fiches les joueurs devront se connecter avec leur adresse mail et un mot de passe qu'ils choissiront
	- Le lien fiche de personnage les envois directement sur leur fiche
- Le maitre du jeu avec son mail et son mot de passe lui devra avoir accés à toutes les fiches de personnage
	- Le lien fiche de personnage envois le MJ sur une page lui permettant de sélectionner quel personnage il veut afficher

- Les fiches de personnage sont composées de différents blocs ou pages. Le format du téléphone ne permettant pas de tout afficher en même temps. Il faut prévoir un système de navigation intuitif prennant peu de place à l'écran comme un menu burger dépliable par exemple.
- Sur la ou les pages des fiches de personnages ne pas utiliser la navigation globale du site.
	- Un menu discret en haut sur toute la largeur doit permettre de switcher entre les Blocs de la fiche de personnage
- Optimiser pour un affichage sur télélphone en 16:9

## Les données
- Supabase sera utilisé pour gérer les données des joueurs, des équipements etc ...
	- Note à la création de la table personnages sur l'interface de Supabase, il faut cocher la case « Enable Realtime » (Activer le temps réel)
	
	- Utilisation de la clé anon pour accéder aux données de Supabase
	
	- RLS (Row Level Security) désactivé pour la phase de dévellopement et les tests. Une fois en production : authentication des joueurs avec auth.uid() = user_id en utilisant leur mail pour savoir quelle fiche de perosnnage ils peuvent afficher modifier. Le MJ aura un compte qui lui permet de tout visualiser et modifier. En plus du mail le joueur devra se choisir un mot de passe à entrer une fois quand il se connecte avec une nouvelle machine.

## Récapitulatif

La fiche se décompose en **12 blocs**, avec plusieurs types d'interactivité à implémenter :
- **Champs calculés** (modificateurs, CA totale, PV max, compétences…)
- **Cases à cocher** (maîtrises, sauvegardes, slots de sorts, JDS, repos)
- **Trackers visuels** (PV actuel avec barre ou numérique, slots de sorts)
- **Tableaux dynamiques** (armes, sorts, capacités limitées)
- **Textes libres** (historique, notes, équipement)

---

### 🧍 BLOC 1 — Identité du personnage
| Champ | Type |
|---|---|
| Classe | Texte libre |
| Niveau | Nombre |
| Race | Texte libre |
| Âge | Nombre |
| Taille | Nombre |
| Poids | Nombre |
| Dieu | Texte libre |
| Devise | Texte libre |
| Points d'expérience | Nombre |
| Alignement | Sélecteur (9 valeurs) |

---

### 💪 BLOC 2 — Caractéristiques (6 stats)
Pour chacune : **valeur**, **bonus (calculé)**, **jet de sauvegarde (calculé)**
- Force
- Intelligence
- Sagesse
- Dextérité
- Constitution
- Charisme

**+ Bonus de maîtrise** (calculé selon le niveau)
**+ Initiative** (= mod. Dextérité)

---

### 🏃 BLOC 3 — Déplacements & charge
| Champ | Type |
|---|---|
| Vitesse de base (m) | Nombre |
| Vitesse chargé | Calculé |
| Saut en longueur | Calculé |
| Saut en hauteur | Calculé |
| Charge maximum | Calculé (Force × 7,5) |

---

### 🛡️ BLOC 4 — Classe d'armure
| Composante | Type |
|---|---|
| Armure | Nombre |
| Bouclier | Nombre |
| Bonus Dextérité | Calculé |
| Magie | Nombre |
| Autre | Nombre |
| **TOTAL** | Calculé |

---

### ❤️ BLOC 5 — Points de vie & dés de vie
| Champ | Type |
|---|---|
| Dés de vie (nombre) | Nombre |
| Type de dé (d6/d8/d10…) | Sélecteur |
| PV de base | Nombre |
| PV total | Calculé |
| PV actuel | Nombre |
| Repos courts (cases) | Cases à cocher |
| JDS succès (3 cases) | Cases à cocher |
| JDS échecs (3 cases) | Cases à cocher |

---

### 🎯 BLOC 6 — Compétences (18 compétences)
Pour chacune : **case de maîtrise**, **valeur calculée** (mod. de caractéristique + bonus maîtrise si coché)
| Inspiration | Booléen (case à cocher) | ?

| Compétence | Caractéristique |
|---|---|
| Acrobaties | Dextérité |
| Arcanes | Intelligence |
| Athlétisme | Force |
| Discrétion | Dextérité |
| Dressage | Sagesse |
| Escamotage | Dextérité |
| Histoire | Intelligence |
| Intimidation | Charisme |
| Investigation | Intelligence |
| Médecine | Sagesse |
| Nature | Intelligence |
| Perception | Sagesse |
| Perspicacité | Sagesse |
| Persuasion | Charisme |
| Religion | Intelligence |
| Représentation | Charisme |
| Survie | Sagesse |
| Tromperie | Charisme |

**+ Perception passive** (= 10 + mod. Perception)

---

### ⚔️ BLOC 7 — Armes
Tableau avec **N lignes**, chaque arme ayant :
| Champ | Type |
|---|---|
| Nom de l'arme | Texte libre |
| Bonus toucher : Carac | Calculé |
| Bonus toucher : Maîtrise | Case à cocher |
| Bonus toucher : Spécial | Nombre |
| Bonus toucher : Magie | Nombre |
| **Total toucher** | Calculé |
| Dégâts : Carac | Calculé |
| Dégâts : Spécial | Nombre |
| Dégâts : Magie | Nombre |
| Dégâts : Type de dé | Texte (ex: 1d8) |
| **Total dégâts** | Calculé |

---

### 🎒 BLOC 8 — Équipement & Possessions
- Liste libre d'objets portés (équipement)
- Liste libre de possessions (argent, objets)
- Section **Objets magiques** (liste avec descriptions)

---

### ✨ BLOC 9 — Sorts
Par **niveau de sort (0 à 9)** :
| Champ | Type |
|---|---|
| Nombre de sorts à préparer | Nombre |
| Cases de sorts utilisés (jusqu'à 7) | Cases à cocher |
| Classe de sort associée | Texte |
| DD des sorts | Calculé |
| Bonus d'attaque des sorts | Calculé |

**Tableau de sorts** (N lignes) :
| Champ | Type |
|---|---|
| Nom du sort | Texte |
| Préparé | Case à cocher |
| Temps d'incantation | Texte |
| Durée | Texte |
| Portée | Texte |
| Description | Texte long |

---

### 🌟 BLOC 10 — Traits & Capacités de classe
- Traits raciaux / Capacités de classe (texte libre long)
- Maîtrises & Langues (texte libre)

**Capacités à utilisations limitées** (tableau) :
| Champ | Type |
|---|---|
| Nom | Texte |
| Max utilisations | Nombre |
| Utilisé | Nombre/cases |
| Type de repos (court/long) | Sélecteur |
| Action requise | Texte |
| PV temporaires accordés | Nombre |

---

### 📖 BLOC 11 — Historique / Personnalité
| Champ | Type |
|---|---|
| Trait 1 | Texte libre |
| Trait 2 | Texte libre |
| Trait 3 | Texte libre |
| Trait 4 | Texte libre |
| Idéal | Texte libre |
| Lien | Texte libre |
| Défaut | Texte libre |

---

### 📝 BLOC 12 — Notes / Divers
- Zone de texte libre générale

---



