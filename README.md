# 5ACHAT — V1 bêta

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
3. Dans 5ACHAT, onglet Sauvegarde, utiliser directement le projet 5ACHAT préconfiguré (URL et clé publique publishable). Ne jamais utiliser service_role, mot de passe DB ou clé secrète dans le navigateur ou GitHub.
4. Créer un compte, confirmer l'adresse et se connecter. Au premier rapprochement, choisir explicitement la copie locale ou distante.
5. Une fois connecté et rapproché, les changements locaux sont envoyés automatiquement. Les révisions empêchent les écrasements distants concurrents. Les anciennes versions sont consultables dans l'historique de sauvegarde (50 versions). La session est en mémoire par défaut. L’option Rester connecté conserve le jeton de renouvellement localement sur un appareil privé ; il n’est pas chiffré par l’application.
6. Configurer les backups indépendants du fournisseur selon le plan ; tester leur restauration avant utilisation en production.

Le RPC save_workspace est transactionnel : contrôle de propriétaire via auth.uid(), comparaison de révision, projection relationnelle, historique. RLS lecture par propriétaire, écriture via RPC uniquement. Les modules produits, prix, dépenses, factures et paiements sont intégrés à l'interface Activité. La migration 002_business_projection.sql synchronise les projections relationnelles dans la même transaction que la sauvegarde versionnée et refuse les paiements excessifs. Les 10 tables sont décrites dans la migration.

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

## V1 bêta

Charte 5DEV orange/noir/blanc, monogramme 5/check, thème sombre, catalogue, historique des prix unitaires, comparaison par devise, autres dépenses, factures et paiements partiels, impression PDF via le navigateur et export CSV. Les données sont synchronisées après validation de la migration 002. OCR, scan caméra, notifications push, sauvegarde externe indépendante et import Excel natif restent à développer. Le workflow Android corrige l’installation obsolète du paquet SDK `tools` et applique les ressources de marque. La signature release et les essais sur appareil restent nécessaires.

## Bêta.2 — mobilité et import

Importer un fichier CSV ou XLSX (première feuille, en-têtes Fournisseur/Produit obligatoires ; Quantité/Devise/Montant/Acheté facultatifs ; maximum 8 Mo et 2 000 articles ; valeurs seules, sans formules). Scanner une photo de code-barres via API native ou ZXing local. OCR de facture par Tesseract : traitement local, téléchargement initial des modèles de langue, vérification humaine obligatoire. Rappels visuels et notifications locales Android sur autorisation ; horaires indicatifs, pas de push distant. Export et restauration JSON chiffrés AES-256-GCM/PBKDF2 ; partage natif vers un emplacement externe choisi par l’utilisateur. Aucun stockage externe automatique configuré. Ne pas perdre la phrase secrète. Installer les dépendances avec `npm install` avant `npm run build`. Les tests navigateur sont dans e2e/ et le workflow Mobile browser checks. Pour Android, un APK debug généré sur un nouveau runner peut être signé différemment : exporter/synchroniser les données avant toute désinstallation, et configurer une signature release stable avant distribution.
