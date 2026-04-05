# VPS Deployment

This runbook assumes:

- VPS IP: `94.72.110.148`
- Ubuntu-based Linux
- Tailscale already installed on the server
- Target app directory: `/opt/content-empire`

## Isolation on `94.72.110.148`

- Keep this stack in its own Compose project and network.
- Do not reuse ports already consumed by your current Docker workloads.
- Keep the nginx listener bound locally and front it through Tailscale or your existing reverse proxy.
- Do not expose the session-runner, renderer, Redis, Postgres, or MinIO directly to the public internet.

## One-time bootstrap on the VPS

Run these commands on the VPS as `root`:

```bash
mkdir -p /opt/content-empire
apt-get update
apt-get install -y git
git clone <your-repo-url> /opt/content-empire
cd /opt/content-empire
bash scripts/bootstrap-vps.sh
```

If the repo is already present, update it instead:

```bash
cd /opt/content-empire
git pull
```

## Generate secrets locally

Run this on your local machine from the repo root:

```bash
npm install
npm run secrets:generate
```

Copy the generated values into the VPS `.env`.

## Create `.env` on the VPS

From the VPS:

```bash
cd /opt/content-empire
cp .env.example .env
nano .env
```

Minimum values to set correctly:

- `NODE_ENV=production`
- `APP_URL=http://100.x.x.x:8088` or your Tailscale/reverse-proxy URL
- `API_URL=http://api:4000` inside Docker, or the internal URL you want the web container to use
- `DATABASE_URL=postgresql://contentempire:contentempire@postgres:5432/contentempire?schema=public`
- `REDIS_URL=redis://redis:6379`
- `MINIO_ENDPOINT=minio`
- `MINIO_PORT=9000`
- `MINIO_USE_SSL=false`
- `MINIO_ACCESS_KEY=...`
- `MINIO_SECRET_KEY=...`
- `SESSION_ENCRYPTION_KEY=...`
- `INTERNAL_MACHINE_TOKEN=...`
- `ADMIN_PASSWORD=...`
- any platform API credentials you are ready to enable

## Deploy the stack

From the VPS:

```bash
cd /opt/content-empire
APP_DIR=/opt/content-empire bash scripts/deploy-vps.sh
```

This will:

1. install Node dependencies
2. validate `.env`
3. generate the Prisma client
4. build Docker images
5. bring up Postgres, Redis, MinIO, API, web, worker, session-runner, renderer, and nginx

## Verify the stack

From the VPS:

```bash
cd /opt/content-empire
APP_DIR=/opt/content-empire bash scripts/check-stack.sh
docker compose -f infra/docker/docker-compose.yml logs --tail=100
```

Expected checks:

- `docker compose ps` shows containers up
- `http://127.0.0.1:8088/` responds
- `http://127.0.0.1:8088/health-api` responds

## Optional systemd startup

To make the stack auto-start with the server:

```bash
cp infra/systemd/content-empire.service /etc/systemd/system/content-empire.service
systemctl daemon-reload
systemctl enable content-empire.service
systemctl start content-empire.service
systemctl status content-empire.service
```

## Backups

Run a Postgres dump:

```bash
cd /opt/content-empire
APP_DIR=/opt/content-empire BACKUP_DIR=/opt/content-empire-backups bash scripts/backup-data.sh
```

## Security rules

- Keep the web app and API private to Tailscale whenever possible.
- Store `SESSION_ENCRYPTION_KEY`, `ADMIN_PASSWORD`, and `INTERNAL_MACHINE_TOKEN` outside shell history when possible.
- Never let OpenClaw call the session-runner directly; it should only hit the control API.
- Keep session storage encrypted and isolated from application logs.
- Enable only the platform credentials you are ready to test; leave unsupported accounts in manual review until certified.
