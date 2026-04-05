#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/content-empire}"
cd "$APP_DIR"

docker compose -f infra/docker/docker-compose.yml ps
echo
curl -fsS http://127.0.0.1:8088/ >/dev/null && echo "Web is reachable via nginx"
curl -fsS http://127.0.0.1:8088/health-api && echo "API health is healthy"
