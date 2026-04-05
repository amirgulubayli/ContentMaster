#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/content-empire}"
BACKUP_DIR="${BACKUP_DIR:-/opt/content-empire-backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

docker compose -f infra/docker/docker-compose.yml exec -T postgres \
  pg_dump -U contentempire contentempire > "$BACKUP_DIR/postgres-$STAMP.sql"

echo "Postgres backup written to $BACKUP_DIR/postgres-$STAMP.sql"
