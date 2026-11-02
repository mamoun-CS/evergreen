#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/evergreen}"
UPLOAD_DIR="${UPLOAD_DIR:-/var/www/evergreen/uploads}"
ENV_FILE="${ENV_FILE:-/etc/evergreen/evergreen.env}"
STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"
chmod 750 "$BACKUP_DIR"
AVAILABLE_KB="$(df -Pk "$BACKUP_DIR" | awk 'NR==2 {print $4}')"
if [ -z "$AVAILABLE_KB" ] || [ "$AVAILABLE_KB" -lt 1048576 ]; then
  echo "Insufficient free disk space for Evergreen backup" >&2
  exit 1
fi
set -a
. "$ENV_FILE"
set +a
: "${DATABASE_URL:?DATABASE_URL must be set in ENV_FILE}"
if command -v docker >/dev/null 2>&1; then
  DB_ENV_FILE="$(mktemp)"
  trap 'rm -f "$DB_ENV_FILE"' EXIT
  printf 'DATABASE_URL=%s\n' "$DATABASE_URL" > "$DB_ENV_FILE"
  chmod 600 "$DB_ENV_FILE"
  docker run --rm --env-file "$DB_ENV_FILE" \
    -e "BACKUP_STAMP=$STAMP" \
    -v "$BACKUP_DIR:/backups" postgres:17-alpine \
    sh -c 'pg_dump --format=custom --no-owner --file="/backups/postgres-${BACKUP_STAMP}.dump" "$DATABASE_URL"'
else
  pg_dump --format=custom --no-owner --file="$BACKUP_DIR/postgres-$STAMP.dump" "$DATABASE_URL"
fi
tar -C "$(dirname "$UPLOAD_DIR")" -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" "$(basename "$UPLOAD_DIR")"
chmod 640 "$BACKUP_DIR"/postgres-"$STAMP".dump "$BACKUP_DIR"/uploads-"$STAMP".tar.gz
find "$BACKUP_DIR" -type f -name 'postgres-*.dump' -mtime +13 -delete
find "$BACKUP_DIR" -type f -name 'uploads-*.tar.gz' -mtime +13 -delete
