# Eberron — Encyclopédie du Khorvaire

Site web statique de référence pour une campagne de jeu de rôle dans l'univers **Eberron** (D&D). Il recense les peuples, marques draconiques, maisons, dons et liens/idéaux utiles aux joueurs et au maître de jeu.

## Contenu

- **12 races** — fiches HTML détaillées (Humains, Elfes, Nains, etc.)
- **12 marques draconiques**
- **13 maisons draconiques**
- **Dons** et **Liens & idéaux**

Les sources texte (`.txt`) servent de brouillon ou de base ; les pages publiées sont en `.html`.

## Aperçu local

Aucune installation requise. Ouvrez `index.html` dans un navigateur, ou servez le dossier avec un serveur HTTP simple :

```powershell
# Python 3
python -m http.server 8000
```

Puis ouvrez [http://localhost:8000](http://localhost:8000).

> Un serveur local évite certains soucis de chargement de `nav.js` selon le navigateur lors d’un simple double-clic sur un fichier.

## Publication sur GitHub Pages

Ce dépôt est prévu pour être hébergé en **site statique** sur GitHub Pages.

1. Poussez le code sur la branche `main` du dépôt GitHub.
2. Sur GitHub : **Settings** → **Pages**.
3. **Build and deployment** → Source : **Deploy from a branch**.
4. Branche : `main`, dossier : **/ (root)**.
5. Enregistrez ; après quelques minutes, le site est disponible à l’URL :

   **https://reiago.github.io/2026---JdR/**

La page d’accueil est `index.html` à la racine — configuration par défaut pour Pages, sans build ni framework.


## Structure du projet

| Fichier / dossier | Rôle |
|-------------------|------|
| `index.html` | Page d’accueil |
| `races/` | Fiches des 12 races (HTML + sources `.txt`) |
| `nav.html`, `nav.js` | Navigation commune (`nav.js` adapte les liens selon la page) |
| `style.css` | Styles globaux |
| `*.html` (racine) | Maisons, marques, dons, liens & idéaux |

## Licence

Le contenu Eberron et D&D appartient à **Wizards of the Coast**. Ce dépôt est un outil de table privée ; vérifiez les conditions d’utilisation des IP officielles avant toute diffusion publique large.

## Dépôt

- GitHub : [Reiago/Campagne-en-Eberron](https://github.com/Reiago/Campagne-en-Eberron)
