# Guide de déploiement — AshtechPay sur Plesk

## Prérequis Plesk
- Node.js 20+ installé sur le serveur
- PM2 installé globalement : `npm install -g pm2`
- pnpm installé : `npm install -g pnpm`
- Git configuré sur le serveur

---

## Première installation

### 1. Cloner le dépôt sur Plesk

Dans le terminal Plesk (SSH) :

```bash
cd /var/www/vhosts/votre-domaine.com/httpdocs
git clone https://github.com/votre-compte/votre-repo.git .
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
nano .env
```

Remplissez `.env` :
```
PORT=3000
NODE_ENV=production
ASHTECH_PAY_API_KEY=ak_live_votre_vraie_cle
```

### 3. Démarrer avec PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # pour démarrer au boot du serveur
```

### 4. Configurer Plesk — Proxy inverse

Dans Plesk, allez dans :
**Domaines → votre-domaine → Paramètres Apache & Nginx → Règles de proxy**

Ajoutez une règle proxy vers `http://localhost:3000`

---

## Mise à jour (après chaque push GitHub)

```bash
cd /var/www/vhosts/votre-domaine.com/httpdocs
git pull
pm2 restart ashtechpay
```

C'est tout — les fichiers compilés (`dist/`) sont inclus dans le dépôt git.

---

## Structure du build inclus dans git

```
artifacts/api-server/dist/
├── index.mjs          ← Point d'entrée Node.js (serveur Express)
├── pino-*.mjs         ← Workers de logging
├── public/            ← Fichiers React compilés (servis par Express)
│   ├── index.html
│   └── assets/
│       ├── index-*.js
│       └── index-*.css
artifacts/payment-page/dist/
└── public/            ← Idem (copie de sauvegarde)
```

---

## Recompiler le projet (si vous modifiez le code)

Sur Replit ou localement :

```bash
# Avec la clé API pour l'injecter dans le frontend
ASHTECH_PAY_API_KEY=ak_live_votre_cle bash scripts/build-plesk.sh
```

Puis committez et poussez :
```bash
git add artifacts/api-server/dist/ artifacts/payment-page/dist/
git commit -m "build: mise à jour production"
git push
```

Et sur Plesk : `git pull && pm2 restart ashtechpay`

---

## Variables d'environnement — Référence

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `PORT` | Oui | Port du serveur (défaut: 3000) |
| `NODE_ENV` | Oui | Mettre `production` |
| `ASHTECH_PAY_API_KEY` | Oui | Clé API AshtechPay (`ak_live_...`) |

---

## Dépannage

### Le site ne s'affiche pas
→ Vérifiez que PM2 tourne : `pm2 status`
→ Consultez les logs : `pm2 logs ashtechpay`
→ Vérifiez que le proxy Plesk pointe vers le bon port

### Les paiements échouent (erreur gateway)
→ Vérifiez que `ASHTECH_PAY_API_KEY` est bien configurée dans `.env`
→ Contactez AshtechPay pour whitelister l'IP de votre serveur Plesk

### Redémarrage automatique après reboot
```bash
pm2 startup
pm2 save
```
