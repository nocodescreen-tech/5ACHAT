# 5ACHAT — V1 alpha

Gestion mobile des achats et approvisionnements. Application web hors ligne et enveloppe Android Capacitor. Cette version reste à valider sur Android et sur un vrai projet Supabase avant production.

## Démarrage local
Node.js 22+, Python 3.
```sh
npm run check
npm test
npm run build
python -m http.server 8080 --directory www
```
Ouvrir http://localhost:8080. En production, servir www sur HTTPS. Pour importer ses achats, créer une liste puis utiliser Importer texte. Aucune donnée personnelle préremplie dans le dépôt public.

## PostgreSQL / Supabase
1. Créer un projet Supabase privé. Dans SQL Editor, exécuter une seule fois supabase/migrations/001_initial.sql.
2. Activer l'authentification e-mail/mot de passe et les confirmations e-mail.
3. Dans 5ACHAT, onglet Sauvegarde, renseigner l'URL de projet et la clé publique publishable/anon. Ne jamais utiliser service_role, mot de passe DB ou clé secrète dans le navigateur ou GitHub.
4. Créer un compte, confirmer l'adresse et se connecter. Au premier rapprochement, choisir explicitement la copie locale ou distante.
5. Une fois connecté et rapproché, les changements locaux sont envoyés automatiquement. Les révisions empêchent les écrasements distants concurrents. Les anciennes versions sont consultables dans l'historique de sauvegarde (50 versions). La session est en mémoire : reconnexion après fermeture.
6. Configurer les backups indépendants du fournisseur selon le plan ; tester leur restauration avant utilisation en production.

Le RPC save_workspace est transactionnel : contrôle de propriétaire via auth.uid(), comparaison de révision, projection relationnelle, historique. RLS lecture par propriétaire, écriture via RPC uniquement. Les tables produits, prix, dépenses, factures et paiements sont réservées aux futurs modules, pas encore connectées à l'interface. Ne pas utiliser ces tables avant l'implémentation de leurs opérations métier. Les 10 tables sont décrites dans la migration.

## Android
Le workflow GitHub Actions Android APK prépare le web, installe Capacitor 7, génère un projet Android puis assemble un APK debug et l'enregistre comme artifact 5ACHAT-debug-apk. Le résultat n'est disponible que lorsque le workflow réussit. Pour construire localement : Java 21, SDK Android, Node 22.
```sh
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```
Sur Windows utiliser gradlew.bat. L'APK debug est destiné aux tests, pas à Google Play. La publication nécessite une signature release protégée et une validation Android réelle. Alternative : PWA depuis une URL HTTPS déployée.

## Tests et limites
CI JavaScript, workflow PostgreSQL avec auth simulée, workflow APK. Le stockage local utilise localStorage avec version précédente, et l'export JSON reste indispensable. Un navigateur/appareil partagé contient un seul espace local : vérifier le compte choisi avant d'envoyer. Les données ne sont pas chiffrées localement. Pas de synchronisation hors connexion vers le cloud avant reconnexion, et pas d'auto-fusion de conflits. Une sauvegarde de 50 versions ne remplace pas un backup indépendant. Aucune garantie absolue de non-perte.

## Design
Voir design-system/5achat/MASTER.md. Référence publique UI/UX Pro Max consultée ; adaptation manuelle, pas d'exécution de sa CLI ici.
