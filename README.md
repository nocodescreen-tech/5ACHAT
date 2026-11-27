# 5ACHAT

Application mobile-first de gestion des achats. Version 0.1 local-first, sans serveur ni dépendances d’exécution.

## Lancer

Avec Python 3 : `python -m http.server 8080`, puis ouvrir http://localhost:8080. Avec Node.js 22+ : `npm run check` et `npm test`.

## Fonctionnalités

Listes datées, fournisseurs et coordonnées, CRUD articles, quantités libres, montants de ligne CDF/USD indépendants, budgets, achats cochés, sous-totaux, recherche, duplication, corbeille des listes, import texte (format magasin : quantité produit), partage, export CSV, sauvegarde JSON et restauration. Service worker pour le shell hors ligne après premier chargement réussi sur HTTPS ou localhost.

## Données

Le stockage localStorage contient une version actuelle et une précédente. Aucune donnée privée n’est préchargée. Une sauvegarde JSON externe reste nécessaire en cas de perte du téléphone, effacement navigateur ou corruption simultanée. L’application n’est pas encore synchronisée entre appareils et ne dispose pas d’authentification. Pas d’addition de devises ni de conversion automatique.

## Suite

Voir docs/ROADMAP.md. React/TypeScript, API, PostgreSQL, authentification, synchronisation, rapports avancés et application Android native restent à implémenter. Ne jamais committer de données utilisateur ou secrets.
