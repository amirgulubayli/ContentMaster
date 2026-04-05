#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/content-empire}"

if [[ ! -d "$APP_DIR" ]]; then
  echo "APP_DIR '$APP_DIR' does not exist."
  exit 1
fi

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo ".env not found in $APP_DIR"
  exit 1
fi

npm install
npm run env:validate
npm run db:generate

docker compose -f infra/docker/docker-compose.yml build
docker compose -f infra/docker/docker-compose.yml up -d

echo "Deployment complete."
