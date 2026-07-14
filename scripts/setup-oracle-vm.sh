#!/usr/bin/env bash
# ============================================================================
# BlocksWiki — Oracle Always-Free VM one-shot provisioning
# Run on a FRESH Ubuntu 22.04/24.04 Oracle Cloud instance (as a sudo user):
#   bash scripts/setup-oracle-vm.sh \
#       --domain api.yourdomain.com \
#       --cors https://blockswiki.yourdomain.com \
#       --email you@yourdomain.com
#
# What it does:
#   1. Install Docker (+compose plugin) and add current user to the docker group
#   2. Install nginx + certbot
#   3. Clone the repo (HTTPS, public) to /opt/blockswiki
#   4. Generate a production .env with random Strapi secrets
#   5. Build & start the Strapi container (docker compose, persisted volumes)
#   6. Configure nginx reverse proxy + Let's Encrypt SSL (HTTPS redirect)
#   7. Print the admin URL for first-time admin registration
#
# Prerequisites (done in the Oracle Cloud console, NOT here):
#   - An Always-Free VM (ARM Ampere A1, 4 OCPU / 24 GB) on Ubuntu
#   - A DNS A record for your API domain pointing at the VM's PUBLIC IP
#   - OCI Security List / NSG open for 22, 80, 443 (ingress, 0.0.0.0/0)
# ============================================================================
set -euo pipefail

# ---- args ----
API_DOMAIN=""
CORS_ORIGINS=""
EMAIL=""
REPO="https://github.com/gamesushi/blockswiki.git"
INSTALL_DIR="/opt/blockswiki"

while [ $# -gt 0 ]; do
  case "$1" in
    --domain) API_DOMAIN="$2"; shift 2 ;;
    --cors)   CORS_ORIGINS="$2"; shift 2 ;;
    --email)  EMAIL="$2"; shift 2 ;;
    --repo)   REPO="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

[ -z "$API_DOMAIN" ] && read -rp "API domain (e.g. api.yourdomain.com): " API_DOMAIN
[ -z "$CORS_ORIGINS" ] && read -rp "Frontend CORS origin (e.g. https://blockswiki.yourdomain.com): " CORS_ORIGINS
[ -z "$EMAIL" ] && read -rp "Email for Let's Encrypt cert: " EMAIL

[ -z "$API_DOMAIN" ] && { echo "API_DOMAIN required" >&2; exit 1; }
[ -z "$EMAIL" ] && { echo "EMAIL required" >&2; exit 1; }
CORS_ORIGINS="${CORS_ORIGINS:-https://$API_DOMAIN}"

echo "==> Provisioning BlocksWiki on $API_DOMAIN (CORS: $CORS_ORIGINS)"

# ---- 1. Docker ----
echo "==> Installing Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER" || true

# ---- 2. nginx + certbot ----
echo "==> Installing nginx + certbot"
sudo apt-get update -y
sudo apt-get install -y nginx certbot python3-certbot-nginx

# ---- 3. Clone repo ----
echo "==> Cloning $REPO -> $INSTALL_DIR"
if [ ! -d "$INSTALL_DIR" ]; then
  sudo git clone "$REPO" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"

# ---- 4. Generate production .env ----
echo "==> Generating production .env"
gen() { openssl rand -base64 16 | tr -d '/+=' | head -c 24; }
cat > .env <<EOF
APP_KEYS=$(gen),$(gen),$(gen),$(gen)
API_TOKEN_SALT=$(gen)
ADMIN_JWT_SECRET=$(gen)
JWT_SECRET=$(gen)
TRANSFER_TOKEN_SALT=$(gen)
ENCRYPTION_KEY=$(gen)
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
CORS_ORIGINS=$CORS_ORIGINS
EOF
echo "    .env written (gitignored, contains random secrets)"

# ---- 5. Build & start Strapi ----
echo "==> Building & starting Strapi container (this can take a few minutes)"
sudo docker compose up -d --build

# ---- 6. nginx reverse proxy ----
echo "==> Writing nginx site for $API_DOMAIN"
sudo tee /etc/nginx/sites-available/blockswiki-api.conf >/dev/null <<NGINX
server {
    listen 80;
    server_name ${API_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:1338;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
    }
}
NGINX
sudo ln -sf /etc/nginx/sites-available/blockswiki-api.conf /etc/nginx/sites-enabled/blockswiki-api.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx

# ---- 7. SSL ----
echo "==> Requesting Let's Encrypt certificate (HTTP-01 challenge)"
sudo certbot --nginx -d "$API_DOMAIN" \
  --non-interactive --agree-tos -m "$EMAIL" --redirect --hsts

# ---- Done ----
echo ""
echo "============================ DONE ============================"
echo "Strapi admin:   https://$API_DOMAIN/admin"
echo "API base:       https://$API_DOMAIN/api"
echo ""
echo "First visit -> register the admin account (fresh DB has no users)."
echo "To manage: cd $INSTALL_DIR && sudo docker compose logs -f strapi"
echo "=============================================================="
