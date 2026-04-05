# Content Empire

Production-oriented monorepo for a private social media operations platform with:

- Internal Next.js operator dashboard
- Fastify control API for UI and OpenClaw
- BullMQ worker orchestration
- Session vault and browser automation runner
- Remotion/ffmpeg renderer service
- Prisma schema for PostgreSQL
- Docker Compose stack for self-hosted deployment

## Workspaces

- `apps/web`: operator UI
- `apps/api`: control API
- `apps/worker`: orchestration worker
- `apps/session-runner`: isolated session execution service
- `apps/renderer`: media rendering service
- `packages/shared`: shared types, seeds, and policies
- `packages/connectors`: connector registry and platform capabilities
- `packages/db`: Prisma schema and database client

## Local setup

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Run `npm run env:validate` after filling required values.
4. Run `npm run db:generate`.
5. Start infra with `docker compose -f infra/docker/docker-compose.yml up -d postgres redis minio`.
6. Run services with the `dev:*` scripts.

## Production helpers

- `npm run secrets:generate`: generates values for `SESSION_ENCRYPTION_KEY`, `INTERNAL_MACHINE_TOKEN`, `ADMIN_PASSWORD`, and `MINIO_SECRET_KEY`
- `npm run env:validate`: validates the required `.env` keys before deploy
- `scripts/bootstrap-vps.sh`: installs Docker and Compose on an Ubuntu VPS
- `scripts/deploy-vps.sh`: installs dependencies, validates env, builds, and starts the stack
- `scripts/check-stack.sh`: checks running containers and local health endpoints
- `scripts/backup-data.sh`: creates a PostgreSQL dump for the self-hosted stack

## VPS quick path

1. Bootstrap the VPS once:
   ```bash
   sudo bash scripts/bootstrap-vps.sh
   ```
2. Generate secrets locally:
   ```bash
   npm run secrets:generate
   ```
3. Copy the repo to `/opt/content-empire` on the VPS and create `.env`.
4. Deploy:
   ```bash
   APP_DIR=/opt/content-empire bash scripts/deploy-vps.sh
   ```
5. Verify:
   ```bash
   APP_DIR=/opt/content-empire bash scripts/check-stack.sh
   ```

## Production notes

- Keep the web app and API private behind Tailscale.
- Expose only narrowly scoped callback/webhook routes through your reverse proxy.
- Use app-level login even when Tailscale already restricts network access.
- Rotate `SESSION_ENCRYPTION_KEY` and machine tokens through a secret manager or secure VPS environment injection.
- Use [docs/VPS-DEPLOYMENT.md](C:\BUISNESS%20FILES\AI%20PROJECTS\CONTENTHOUSE\docs\VPS-DEPLOYMENT.md) for the full runbook.
