# Run from a trusted computer, never in public CI. Requires JDK, GitHub CLI, Bash, and admin access.
set -euo pipefail
umask 077
REPO=nocodescreen-tech/5ACHAT
ENVIRONMENT=android-production
KEYDIR="${HOME}/.5achat-signing"
mkdir -p "$KEYDIR"
chmod 700 "$KEYDIR"
KEYSTORE="$KEYDIR/5achat-release.p12"
command -v keytool >/dev/null
command -v gh >/dev/null
gh auth status
if [[ -e "$KEYSTORE" ]]; then
  echo "Existing signing key found. Refusing to overwrite it."
else
  keytool -genkeypair -keystore "$KEYSTORE" -storetype PKCS12 -alias 5achat -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=5ACHAT,O=5DEV'
fi
read -r -s -p 'Existing keystore password: ' STORE_PASS
printf '\n'
export STORE_PASS
keytool -list -keystore "$KEYSTORE" -storepass:env STORE_PASS -alias 5achat >/dev/null
gh api --method PUT "repos/$REPO/environments/$ENVIRONMENT" >/dev/null
base64 < "$KEYSTORE" | tr -d '\r\n' | gh secret set ANDROID_KEYSTORE_BASE64 --repo "$REPO" --env "$ENVIRONMENT"
printf '%s' "$STORE_PASS" | gh secret set ANDROID_KEYSTORE_PASSWORD --repo "$REPO" --env "$ENVIRONMENT"
printf '%s' "$STORE_PASS" | gh secret set ANDROID_KEY_PASSWORD --repo "$REPO" --env "$ENVIRONMENT"
printf '%s' 5achat | gh secret set ANDROID_KEY_ALIAS --repo "$REPO" --env "$ENVIRONMENT"
unset STORE_PASS
printf 'Signing credentials configured. Keep an encrypted offline copy of %s and its password.\n' "$KEYSTORE"
