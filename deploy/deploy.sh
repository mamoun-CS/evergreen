#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/evergreen/app}"
PM2_APP="${PM2_APP:-evergreen-store}"

cd "$APP_DIR"
git pull --ff-only
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  pm2 reload "$PM2_APP" --update-env
else
  pm2 start deploy/ecosystem.config.cjs --only "$PM2_APP"
fi
pm2 save
