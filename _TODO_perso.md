---

## Blocs d'information de la fiche de personnage D&D

---

# Objectif — Fiches de personnage D&D consultables et modifiables en ligne

## Infrastructure
- Hébergement sur **GitHub Pages** : https://github.com/Reiago/Campagne-en-Eberron
- Base de données **Supabase**, projet `Eberron_Project`
  - Page de test configurée : `test_supabase.html` ✅ test OK
  - Utilisation de la **clé anon** pour l'accès aux données
  - **RLS désactivé** en phase de développement
  - En production : `auth.uid() = user_id` — chaque joueur ne voit que sa fiche ; le MJ a accès à tout
  - À la création de la table `personnages` sur Supabase : cocher **"Enable Realtime"**

## Accès & Authentification
- **Joueurs** : connexion par adresse mail + mot de passe choisi lors du premier accès
  - Redirigés directement sur leur propre fiche de personnage
- **Maître du Jeu (MJ)** : compte avec accès à toutes les fiches
  - Redirigé vers une page de sélection de personnage

## Navigation & Interface
- **Portail principal** : `index.html` — point d'entrée vers toutes les sections (fiches, cartes, images, comptes rendus…)
- **Fiches de personnage** : navigation propre, indépendante de la nav globale du site
  - Menu fixe discret en haut (pleine largeur) pour switcher entre les 12 blocs
  - Menu burger dépliable ou onglets pour économiser l'espace écran
- **Optimisé mobile** : format 16:9, compatible PC et téléphone

---

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
| Nom | Texte libre |
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

**Formule du modificateur** : `(Valeur − 10) ÷ 2`, arrondi à l'inférieur

| Valeur | Modificateur |
|---|---|
| 1 | −5 |
| 2–3 | −4 |
| 4–5 | −3 |
| 6–7 | −2 |
| 8–9 | −1 |
| 10–11 | 0 |
| 12–13 | +1 |
| 14–15 | +2 |
| 16–17 | +3 |
| 18–19 | +4 |
| 20–21 | +5 |
| 22–23 | +6 |

Pour chacune : **valeur**, **modificateur (calculé)**, **jet de sauvegarde (calculé)**
- Force
- Intelligence
- Sagesse
- Dextérité
- Constitution
- Charisme

**Jet de sauvegarde** = Modificateur de la caractéristique + Bonus de maîtrise (si maîtrise cochée)

**Bonus de maîtrise** selon le niveau :
| Niveau | Bonus de maîtrise |
|---|---|
| 1–4 | +2 |
| 5–8 | +3 |
| 9–12 | +4 |
| 13–16 | +5 |
| 17–20 | +6 |

**Initiative** = Modificateur de Dextérité

---

### 🏃 BLOC 3 — Déplacements & Charge

| Champ | Type | Formule |
|---|---|---|
| Vitesse de base (m) | Nombre | Selon race/classe |
| Autres vitesses | Texte | Nage, escalade, vol (si applicable) |
| Saut en longueur (avec élan ≥ 3 m) | Calculé | Force ÷ 3 mètres |
| Saut en longueur (sans élan) | Calculé | (Force ÷ 3) ÷ 2 mètres |
| Saut en hauteur (avec élan ≥ 3 m) | Calculé | (Mod. Force ÷ 3) + 1 m (min 0) |
| Saut en hauteur (sans élan) | Calculé | Hauteur normale ÷ 2 |
| Charge maximum | Calculé | Force × 7,5 kg |

> Chaque mètre franchi lors d'un saut coûte 1 m de déplacement.

**Variante d'encombrement (optionnelle)** :
- Poids > Force × 2,5 → **encombré** : vitesse −3 m
- Poids > Force × 5 → **fortement encombré** : vitesse −6 m + désavantage aux jets de Force, Dextérité et Constitution

---

### 🛡️ BLOC 4 — Classe d'Armure (CA)

| Composante | Type |
|---|---|
| Type d'armure | Sélecteur (sans / légère / intermédiaire / lourde) |
| Valeur de base armure | Nombre |
| Bouclier | Nombre (+2 si équipé) |
| Bonus Dextérité | Calculé (voir ci-dessous) |
| Magie | Nombre |
| Autre | Nombre |
| **TOTAL CA** | **Calculé** |

**Calcul selon le type d'armure** :
| Type | Formule CA |
|---|---|
| Sans armure | 10 + Mod. Dextérité |
| Armure légère | Valeur armure + Mod. Dextérité |
| Armure intermédiaire | Valeur armure + Mod. Dextérité (max +2) |
| Armure lourde | Valeur armure (Mod. Dex ignoré) |
| + Bouclier | +2 dans tous les cas |

> Sans maîtrise de l'armure portée : impossibilité de lancer des sorts et désavantage aux jets de Force et Dextérité.

---

### ❤️ BLOC 5 — Points de Vie & Dés de Vie

| Champ | Type | Formule |
|---|---|---|
| Type de dé de vie | Sélecteur | d6 / d8 / d10 / d12 selon classe |
| Nombre de dés de vie | Calculé | = Niveau |
| PV niveau 1 | Calculé | Valeur max du dé + Mod. Constitution |
| PV par niveau suivant | Calculé | Lancé dé de vie + Mod. Constitution (min 1 par niveau) |
| PV maximum total | Calculé | Somme de tous les niveaux |
| PV actuel | Nombre (modifiable) | |
| PV temporaires | Nombre | Ne s'additionnent pas aux PV max |

**Dé de vie par classe** :
| Classe | Dé de vie |
|---|---|
| Magicien | d6 |
| Barde, Clerc, Druide, Moine, Roublard | d8 |
| Combattant, Paladin, Rôdeur | d10 |
| Barbare | d12 |

**Repos** :
- **Repos court** (≥ 1h) : dépenser 1 ou plusieurs dés de vie → récupère (dé + Mod. Constitution) PV par dé lancé
- **Repos long** (≥ 8h) : récupère **tous les PV** + la moitié des dés de vie dépensés (min 1). Maximum 1 repos long par 24h.

**Jets de sauvegarde contre la mort (JDS)** :
- 3 succès → stabilisé | 3 échecs → mort
- 20 naturel → récupère 1 PV immédiatement
- 1 naturel → compte pour 2 échecs

| Champ | Type |
|---|---|
| Dés de vie restants | Nombre / cases |
| JDS succès (3 cases) | Cases à cocher |
| JDS échecs (3 cases) | Cases à cocher |

---

### 🎯 BLOC 6 — Compétences (18 compétences)

**Formule** : Mod. de la caractéristique associée + Bonus de maîtrise (si case de maîtrise cochée)
**Expertise** (Roublard, Barde…) : Mod. caractéristique + **2 ×** Bonus de maîtrise

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

**Perception passive** = 10 + Mod. Sagesse + Bonus de maîtrise (si maîtrise Perception)

**Inspiration** : Booléen (case à cocher) — accordée par le MJ, permet de lancer un d20 supplémentaire sur un jet et de choisir le meilleur résultat.

---

### ⚔️ BLOC 7 — Armes

Tableau avec **N lignes**, chaque arme ayant :

| Champ | Type | Formule |
|---|---|---|
| Nom de l'arme | Texte libre | |
| Caractéristique utilisée | Sélecteur | For ou Dex ; Finesse : au choix du joueur |
| Bonus toucher : Carac | Calculé | Mod. Force ou Dextérité |
| Bonus toucher : Maîtrise | Case à cocher | + Bonus de maîtrise si coché |
| Bonus toucher : Magie | Nombre | Enchantement +1 / +2 / +3 |
| Bonus toucher : Spécial | Nombre | Capacités de classe, etc. |
| **Total toucher** | **Calculé** | Mod. Carac + Maîtrise + Magie + Spécial |
| Dégâts : Dé | Texte | ex : 1d8, 2d6 |
| Dégâts : Carac | Calculé | Même mod. que pour le toucher |
| Dégâts : Magie | Nombre | Même bonus que toucher magie |
| Dégâts : Spécial | Nombre | |
| Type de dégâts | Texte | Tranchant / Perforant / Contondant |
| **Total dégâts** | **Calculé** | Dé + Mod. Carac + Magie + Spécial |

> Armes à distance : utilisent le Mod. Dextérité. Armes à lancer (javelot, hache…) : peuvent utiliser le Mod. Force.

---

### 🎒 BLOC 8 — Équipement & Possessions
- Liste libre d'objets portés (équipement)
- Monnaie : PP (platine), PO (or), PE (électrum), PA (argent), PC (cuivre)
  - 1 PO = 10 PA = 100 PC | 1 PP = 10 PO
- Section **Objets magiques** (liste avec noms et descriptions)

---

### ✨ BLOC 9 — Sorts

**Caractéristique d'incantation** (selon la classe) :
| Classe | Caractéristique |
|---|---|
| Barde, Ensorceleur, Paladin, Occultiste | Charisme |
| Clerc, Druide, Rôdeur | Sagesse |
| Magicien | Intelligence |

**DD des sorts** = 8 + Bonus de maîtrise + Mod. caractéristique d'incantation

**Bonus d'attaque des sorts** = Bonus de maîtrise + Mod. caractéristique d'incantation

Par **niveau de sort (0 à 9)** :
| Champ | Type |
|---|---|
| Nombre d'emplacements disponibles | Nombre (selon classe et niveau de personnage) |
| Emplacements utilisés | Cases à cocher (jusqu'à 9 max selon niveau) |
| Nombre de sorts préparés (si applicable) | Nombre (ex. Magicien : Int + niveau) |

**Tableau de sorts** (N lignes) :
| Champ | Type |
|---|---|
| Nom du sort | Texte |
| Niveau du sort | Nombre (0 = tour de magie) |
| Préparé | Case à cocher |
| Temps d'incantation | Texte (action, action bonus, réaction, 1 min…) |
| Durée | Texte |
| Portée | Texte |
| Concentration | Booléen |
| Composantes | Cases V / S / M |
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
| Utilisé | Nombre / cases à cocher |
| Rechargement | Sélecteur (repos court / repos long / aube / jamais) |
| Action requise | Sélecteur (Action / Action bonus / Réaction / Libre) |
| Description courte | Texte |

---

### 📖 BLOC 11 — Historique / Personnalité
| Champ | Type |
|---|---|
| Trait de personnalité 1 | Texte libre |
| Trait de personnalité 2 | Texte libre |
| Idéal | Texte libre |
| Lien | Texte libre |
| Défaut | Texte libre |
| Historique (background) | Texte libre |

---

### 📝 BLOC 12 — Notes / Divers
- Zone de texte libre générale

---
