#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${LETSENCRYPT_DOMAIN:-commons.ericpino.com}"
EMAIL="${LETSENCRYPT_EMAIL:-eric@posible.net}"

echo ">>> Stopping any docker-compose.letsencrypt.yml containers if running..."
docker compose -f docker-compose.letsencrypt.yml down 2>/dev/null || true

echo ">>> Starting Commons containers (db, api, web on port 3005)..."
docker compose -f docker-compose.yml up --build -d

echo ">>> Installing host Nginx config for $DOMAIN -> http://127.0.0.1:3005..."
sudo cp deploy/nginx/host-nginx.conf "/etc/nginx/sites-available/$DOMAIN"
sudo ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"

echo ">>> Testing and reloading host Nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo ">>> Requesting and installing Let's Encrypt SSL certificate via host Certbot..."
if ! command -v certbot >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y certbot python3-certbot-nginx
fi

sudo certbot --nginx \
  -d "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  -m "$EMAIL" \
  --redirect

echo ">>> Reloading host Nginx..."
sudo systemctl reload nginx

echo ">>> Done! https://$DOMAIN is now proxying to http://127.0.0.1:3005 with Let's Encrypt SSL."
