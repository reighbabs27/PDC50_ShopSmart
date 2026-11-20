#!/usr/bin/env bash
# Deploy a specific, committed version of ShopSmart to the EC2 host.
#   sudo shopsmart-deploy <git-ref>      e.g. sudo shopsmart-deploy v1.1.0
# Order: backup -> checkout -> install -> generate -> migrate deploy -> build -> publish -> restart -> health.
# Uses `prisma migrate deploy` (applies committed migrations only, never resets data)
# and never runs the destructive seed.
set -euo pipefail

GIT_REF="${1:-main}"
APP_DIR=/opt/shopsmart
WEB_ROOT=/var/www/shopsmart
ENV_FILE=/etc/shopsmart/api.env
RELEASE_FILE=/etc/shopsmart/release.env

if [[ $EUID -ne 0 ]]; then echo "Run with sudo." >&2; exit 1; fi
as_app() { sudo -u shopsmart -H bash -c "cd '$APP_DIR' && $1"; }
with_env() { sudo -u shopsmart -H bash -c "set -a; . '$ENV_FILE'; set +a; cd '$APP_DIR' && $1"; }

echo "==> Backup database before changing anything"
/usr/local/bin/shopsmart-backup || echo "    (backup skipped: database may not exist yet)"

echo "==> Checkout $GIT_REF"
as_app "git fetch --all --tags --prune && git checkout --force '$GIT_REF' && (git pull --ff-only 2>/dev/null || true)"
COMMIT="$(as_app 'git rev-parse --short HEAD')"
VERSION="$(as_app "node -p \"require('./package.json').version\"")"
echo "    version $VERSION, commit $COMMIT"

echo "==> Install dependencies (includes dev tools needed for prisma and vite)"
as_app "npm ci --no-audit --no-fund"

echo "==> Prisma client and committed migrations"
with_env "npm run db:generate"
with_env "npm run db:deploy"
with_env "npm run db:status"
# Adds starter products only if missing. Never deletes orders or customers.
with_env "npm run db:seed:catalog"

echo "==> Build frontend (same-origin API: VITE_API_URL=/api)"
as_app "VITE_API_URL=/api npm run build"
rsync -a --delete "$APP_DIR/frontend/dist/" "$WEB_ROOT/"
chown -R shopsmart:www-data "$WEB_ROOT"

echo "==> Record release and restart API"
printf 'APP_VERSION=%s\nGIT_COMMIT=%s\n' "$VERSION" "$COMMIT" > "$RELEASE_FILE"
chown root:shopsmart "$RELEASE_FILE"; chmod 0640 "$RELEASE_FILE"
systemctl restart shopsmart-api

echo "==> Health check"
for attempt in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:3000/api/health; then echo; echo "Release $VERSION ($COMMIT) is healthy."; exit 0; fi
  sleep 2
done
echo "Health check failed. Inspect: sudo journalctl -u shopsmart-api -n 100 --no-pager" >&2
exit 1
