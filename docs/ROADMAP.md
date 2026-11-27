# 5ACHAT — Feuille de route

## Phase 1 : fondations
- Monorepo TypeScript, React, Node.js, PostgreSQL et Prisma.
- Checklist mobile-first, magasins, articles, quantités, montants, statuts et budgets.
- CDF/USD séparés, taux explicite pour conversion.
- IndexedDB, sauvegarde automatique, import/export JSON, restauration, tests de persistance.

## Phase 2 : backend et sécurité
- Authentification, isolation des comptes, validation des entrées, synchronisation versionnée et gestion des conflits.
- Sauvegardes PostgreSQL et tests de restauration.

## Phase 3 : gestion professionnelle
- Catalogue, fournisseurs, historique des prix, commandes, dettes, paiements partiels et justificatifs.
- Rapports PDF/CSV/Excel, recherche, filtres et historique.

## Phase 4 : mobilité et automatisation
- PWA, Android via Capacitor, notifications, import de listes WhatsApp assisté par IA avec validation humaine.
- CI GitHub Actions, tests et déploiement.

Ne jamais enregistrer de secrets ni de données réelles des utilisateurs dans le dépôt public. Les fonctionnalités listées restent à développer.
