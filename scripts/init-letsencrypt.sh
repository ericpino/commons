#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${LETSENCRYPT_DOMAIN:-commons.ericpino.com}"
EMAIL="${LETSENCRYPT_EMAIL:-}"
STAGING="${LETSENCRYPT_STAGING:-0}"
COMPOSE_FILE="docker-compose.letsencrypt.yml"

echo ">>> Starting database, API, and Web services..."
docker compose -f "$COMPOSE_FILE" up --build -d db api web

echo ">>> Creating temporary dummy certificate for $DOMAIN so Nginx can start..."
docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "\
  sh -c 'mkdir -p /var/www/certbot/.well-known/acme-challenge /etc/letsencrypt/live/$DOMAIN && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj /CN=localhost'" certbot

echo ">>> Starting (or recreating) Nginx with latest config..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate nginx

echo ">>> Removing temporary dummy certificate files before requesting live certificate..."
docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

EMAIL_ARG="--register-unsafely-without-email"
if [ -n "$EMAIL" ]; then
  EMAIL_ARG="--email $EMAIL"
fi

STAGING_ARG=""
if [ "$STAGING" != "0" ]; then
  STAGING_ARG="--staging"
fi

echo ">>> Requesting Let's Encrypt certificate for $DOMAIN..."
docker compose -f "$COMPOSE_FILE" run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    $EMAIL_ARG \
    -d $DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --non-interactive \
    --force-renewal" certbot

echo ">>> Reloading Nginx with live Let's Encrypt certificate..."
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload

echo ">>> Starting background Certbot auto-renewal service..."
docker compose -f "$COMPOSE_FILE" up -d certbot

echo ">>> Done! https://$DOMAIN is live with Let's Encrypt TLS."
