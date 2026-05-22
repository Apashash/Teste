#!/usr/bin/env bash
set -e

echo "=== AshtechPay — Build Plesk ==="
echo ""

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Installation des dépendances..."
pnpm install --frozen-lockfile

echo ""
echo "[2/4] Compilation du frontend React..."
export NODE_ENV=production
export BASE_PATH=/
export PORT=3000
# Injecter la clé API dans le build si disponible
if [ -n "$ASHTECH_PAY_API_KEY" ]; then
  echo "  -> Clé API AshtechPay détectée, injection dans le frontend..."
fi

pnpm --filter @workspace/payment-page run build

echo ""
echo "[3/4] Compilation du serveur Express..."
pnpm --filter @workspace/api-server run build

echo ""
echo "[4/4] Copie du frontend dans le serveur..."
FRONTEND_DIST="$ROOT_DIR/artifacts/payment-page/dist/public"
SERVER_DIST="$ROOT_DIR/artifacts/api-server/dist/public"

if [ -d "$FRONTEND_DIST" ]; then
  rm -rf "$SERVER_DIST"
  cp -r "$FRONTEND_DIST" "$SERVER_DIST"
  echo "  -> Frontend copié dans artifacts/api-server/dist/public"
else
  echo "  ERREUR: Le build frontend est introuvable dans $FRONTEND_DIST"
  exit 1
fi

echo ""
echo "=== Build terminé avec succès ==="
echo ""
echo "Fichiers générés :"
echo "  artifacts/api-server/dist/index.mjs   -> Point d'entrée Node.js"
echo "  artifacts/api-server/dist/public/     -> Fichiers statiques React"
echo ""
echo "Pour démarrer : node artifacts/api-server/dist/index.mjs"
echo "   ou via PM2 : pm2 start ecosystem.config.cjs"
