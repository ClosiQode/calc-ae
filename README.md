# Calc AE

Calculatrice des charges auto‑entrepreneur (HTML/CSS/JS pur) packagée en application desktop avec Electron.

- Interface sombre, responsive, paramètres à gauche, résultats à droite
- Modes Simple et Mixte
- Options avancées (taux, CFP/CCI, VL, arrondi) dans une fenêtre dédiée
- Export des résultats en HTML et PDF stylisés (sans formulaire)
- Persistance des réglages
- Packaging Windows/Mac/Linux
- Auto‑update via GitHub Releases (configurable)

## Sommaire
- [Prise en main](#prise-en-main)
- [Fonctionnalités](#fonctionnalités)
- [Options avancées](#options-avancées)
- [Exports](#exports)
- [Persistance](#persistance)
- [Packaging / Build](#packaging--build)
- [Auto‑update](#auto-update)
- [Licence](#licence)

## Prise en main

```bash
# 1) Installer les dépendances
npm install

# 2) Lancer l’application en développement
npm start
```

## Fonctionnalités
- Calcul automatique au changement de champ
- Taux 2025 avec personnalisation (VENTES / BIC / BNC)
- Inclusion/Exclusion de la VL (impôt libératoire)
- Arrondi d’affichage configurable (aucun/inférieur/supérieur/au plus proche)

## Options avancées
- Ouvrir via le bouton « Options avancées »
- Réglages persistants (fichier `settings.json` dans le dossier `userData` Electron)

## Exports
- Export HTML et PDF stylisés (résultats uniquement)
- Le PDF est généré via Electron (`printToPDF`) depuis un HTML dédié et propre

## Persistance
- Les réglages sont enregistrés automatiquement et rechargés au démarrage
- Communication sécurisée via `preload.js` (`window.settings`)

## Packaging / Build

Génération des icônes à partir de `logo.jpeg` et build via electron‑builder.

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Notes:
- Les scripts build exécutent `prebuild` pour générer les icônes sous `build/icons/`
- Les binaires sont produits dans `dist/`

## Auto‑update

Le projet utilise `electron-updater`.

Deux approches possibles:

1) Dépôt d’updates public (recommandé)
   - Créer un dépôt public dédié aux mises à jour (ex: `ClosiQode/calc-ae-updates`)
   - Configurer `package.json > build.publish` vers ce dépôt
   - Avantages: pas de token côté clients, simple à maintenir

2) Dépôt privé
   - Possible, mais nécessite un token GitHub (GH_TOKEN) côté clients (fortement déconseillé)

Publication (avec `electron-builder`):
- Définir `GH_TOKEN` dans l’environnement de la machine de build
- Lancer `npm run build:win` (ou mac/linux) pour packager et publier les Releases

## Licence

MIT © 2025 ClosiQode

Voir le fichier `LICENSE` pour le texte complet de la licence.
