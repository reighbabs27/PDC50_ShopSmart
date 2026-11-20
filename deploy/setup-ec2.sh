#!/usr/bin/env bash
# One-time setup of the ShopSmart single-host layout on Ubuntu Server 24.04 LTS (EC2).
#
#   Usage (on the instance, as the default "ubuntu" user):
#     git clone https://github.com/reighbabs27/PDC50_ShopSmart.git ~/PDC50_ShopSmart
#     sudo bash ~/PDC50_ShopSmart/deploy/setup-ec2.sh <domain> <email-for-lets-encrypt> [git-ref]
#
#   <domain> must already resolve to this instance's public IP, for example
#   shopsmart-13-250-10-20.sslip.io for Elastic IP 13.250.10.20, or a domain you own.
#   Security group must allow inbound 80 and 443 from anywhere and 22 only from your IP.
#
# Read this script before running it. It installs packages, creates a local PostgreSQL
# database with a generated password, requests a Let's Encrypt certificate and starts
# the API under systemd. It prints no secrets.
set -euo pipefail

DOMAIN="${1:?usage: setup-ec2.sh <domain> <email> [git-ref]}"
LE_EMAIL="${2:?usage: setup-ec2.sh <domain> <email> [git-ref]}"
GIT_REF="${3:-main}"
REPO_URL="${REPO_URL:-https://github.com/reighbabs27/PDC50_ShopSmart.git}"
APP_DIR=/opt/shopsmart
WEB_ROOT=/var/www/shopsmart
ENV_DIR=/etc/shopsmart
NODE_MAJOR=22

if [[ $EUID -ne 0 ]]; then echo "Run with sudo." >&2; exit 1; fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> 1/9 Swap (1 GiB instances need it for npm ci and the Vite build)"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> 2/9 OS packages"
apt-get update -y
apt-get install -y ca-certificates curl gnupg git nginx postgresql certbot rsync

echo "==> 3/9 Node.js ${NODE_MAJOR} from the NodeSource apt repository"
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]]; then
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y && apt-get install -y nodejs
fi
node -v

echo "==> 4/9 Service user and folders"
id shopsmart >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/shopsmart --shell /usr/sbin/nologin shopsmart
install -d -o shopsmart -g shopsmart "$APP_DIR"
install -d -o shopsmart -g www-data -m 0755 "$WEB_ROOT"
install -d -m 0750 -o root -g shopsmart "$ENV_DIR"
install -d -m 0755 /var/www/certbot
install -d -m 0750 -o postgres -g postgres /var/backups/shopsmart

echo "==> 5/9 PostgreSQL (localhost only) with a generated password"
systemctl enable --now postgresql
if [[ ! -f "$ENV_DIR/api.env" ]]; then
  DB_PASSWORD="$(openssl rand -hex 24)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'shopsmart_app') THEN
    CREATE ROLE shopsmart_app LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE shopsmart_app PASSWORD '${DB_PASSWORD}';
  END IF;
END \$\$;
SQL
  sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='shopsmart'" | grep -q 1 \
    || sudo -u postgres createdb -O shopsmart_app shopsmart

  umask 027
  cat > "$ENV_DIR/api.env" <<ENV
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATABASE_URL="postgresql://shopsmart_app:${DB_PASSWORD}@127.0.0.1:5432/shopsmart?schema=public"
FRONTEND_URL=https://${DOMAIN}
TRUST_PROXY=true
REQUIRE_HTTPS=true
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
AI_PROVIDER=mock
AI_TIMEOUT_MS=8000
ENV
  chown root:shopsmart "$ENV_DIR/api.env"
  chmod 0640 "$ENV_DIR/api.env"
  unset DB_PASSWORD
  echo "    Wrote $ENV_DIR/api.env (mode 640). The password is not printed."
else
  echo "    $ENV_DIR/api.env already exists; keeping it."
fi

echo "==> 6/9 Application code at $GIT_REF"
if [[ ! -d "$APP_DIR/.git" ]]; then
  sudo -u shopsmart git clone "$REPO_URL" "$APP_DIR"
fi
install -m 0755 "$SCRIPT_DIR/deploy-release.sh" /usr/local/bin/shopsmart-deploy
install -m 0755 "$SCRIPT_DIR/backup-db.sh" /usr/local/bin/shopsmart-backup

echo "==> 7/9 HTTPS certificate for $DOMAIN"
sed "s/__DOMAIN__/${DOMAIN}/g" "$SCRIPT_DIR/nginx/shopsmart-bootstrap.conf" > /etc/nginx/sites-available/shopsmart
ln -sf /etc/nginx/sites-available/shopsmart /etc/nginx/sites-enabled/shopsmart
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" \
    --email "$LE_EMAIL" --agree-tos --no-eff-email --non-interactive \
    --deploy-hook "systemctl reload nginx"
fi
sed "s/__DOMAIN__/${DOMAIN}/g" "$SCRIPT_DIR/nginx/shopsmart.conf" > /etc/nginx/sites-available/shopsmart
nginx -t && systemctl reload nginx

echo "==> 8/9 systemd service"
install -m 0644 "$SCRIPT_DIR/systemd/shopsmart-api.service" /etc/systemd/system/shopsmart-api.service
systemctl daemon-reload
systemctl enable shopsmart-api

echo "==> 9/9 First release (migrations, build, start)"
/usr/local/bin/shopsmart-deploy "$GIT_REF"

echo
echo "Done. Open https://${DOMAIN}/ and run the smoke test from your laptop:"
echo "  npm run smoke -- https://${DOMAIN}"
