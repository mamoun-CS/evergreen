#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/evergreen}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/www/evergreen/uploads}"
ENV_FILE="${ENV_FILE:-/etc/evergreen/evergreen.env}"
STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"
set -a
. "$ENV_FILE"
set +a
: "${DATABASE_URL:?DATABASE_URL must be set in ENV_FILE}"
pg_dump --format=custom --no-owner --file="$BACKUP_DIR/postgres-$STAMP.dump" "$DATABASE_URL"
tar -C "$(dirname "$UPLOAD_DIR")" -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" "$(basename "$UPLOAD_DIR")"
find "$BACKUP_DIR" -type f -name 'postgres-*.dump' -mtime +13 -delete
find "$BACKUP_DIR" -type f -name 'uploads-*.tar.gz' -mtime +13 -delete
