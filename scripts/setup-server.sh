#!/usr/bin/env bash
#
# One-time server setup: create deploy dirs, install nginx (+ optional bun),
# write nginx config and a systemd unit for the Next.js interactive app.
#
# Run on the server (e.g. after SSH):
#   curl -sSL https://raw.githubusercontent.com/.../setup-server.sh | bash
#   # or
#   bash setup-server.sh
#
# Options (env vars):
#   DEPLOY_PATH   Base path for site + interactive (default: /var/www/yosoynathel.com)
#   DOMAIN        server_name for nginx (default: _)
#   NEXT_PORT     Port for Next app (default: 3001)
#   SKIP_NGINX    Set to 1 to skip nginx install/config
#   SKIP_BUN      Set to 1 to skip bun install
#   SKIP_CERTBOT  Set to 1 to skip certbot install and HTTPS certificate generation
#
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/yosoynathel.com}"
DOMAIN="${DOMAIN:-yosoynathel.com}"
NEXT_PORT="${NEXT_PORT:-3001}"
SKIP_NGINX="${SKIP_NGINX:-0}"
SKIP_BUN="${SKIP_BUN:-0}"
SKIP_CERTBOT="${SKIP_CERTBOT:-0}"

# --- Directories ---
echo "Creating directories under $DEPLOY_PATH..."
sudo mkdir -p "$DEPLOY_PATH"/{site,interactive}
sudo chown -R "$(whoami):" "$DEPLOY_PATH" 2>/dev/null || true

if command -v unzip &>/dev/null; then
  echo "Unzip already installed: $(unzip --version)"
else
  echo "Installing unzip..."
  sudo apt update -qq
  sudo apt install -y unzip
fi

# --- Bun (for running Next.js interactive app) ---
if [[ "$SKIP_BUN" != "1" ]]; then
  if command -v bun &>/dev/null; then
    echo "Bun already installed: $(bun --version)"
  else
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
    export PATH="$BUN_INSTALL/bin:$PATH"
  fi
fi

# --- Nginx ---
if [[ "$SKIP_NGINX" != "1" ]]; then
  if ! command -v nginx &>/dev/null; then
    echo "Installing nginx..."
    if command -v apt-get &>/dev/null; then
      sudo apt-get update -qq
      sudo apt-get install -y nginx
    elif command -v dnf &>/dev/null; then
      sudo dnf install -y nginx
    elif command -v yum &>/dev/null; then
      sudo yum install -y nginx
    else
      echo "Could not detect package manager (apt-get, dnf, yum). Install nginx manually and re-run with SKIP_NGINX=1."
      exit 1
    fi
  fi

  NGINX_SITE="yosoynathel.com"
  NGINX_CONF="/etc/nginx/sites-available/$NGINX_SITE"
  sudo tee "$NGINX_CONF" >/dev/null <<EOF
# Static site (Eleventy) at root; Next.js interactive app at /interactive, /_next, /api, /uploads
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    root $DEPLOY_PATH/site;
    index index.html;
    location / {
        try_files \$uri \$uri/ \$uri.html =404;
    }

    location /interactive/ {
        proxy_pass http://127.0.0.1:$NEXT_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /_next {
        proxy_pass http://127.0.0.1:$NEXT_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api {
        proxy_pass http://127.0.0.1:$NEXT_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:$NEXT_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
  sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/"$NGINX_SITE" 2>/dev/null || true
  sudo rm -f /etc/nginx/sites-enabled/default

  echo "Testing nginx config..."
  sudo nginx -t
  echo "Reloading nginx..."
  sudo systemctl reload nginx 2>/dev/null || sudo systemctl reload nginx.service
  echo "Nginx configured and reloaded."
fi

# --- Systemd system unit for Next.js interactive app ---
RUN_USER=$(whoami)
RUN_HOME=$(getent passwd "$RUN_USER" 2>/dev/null | cut -d: -f6)
RUN_HOME="${RUN_HOME:-$HOME}"
BUN_PATH="$RUN_HOME/.bun/bin/bun"

INTERACTIVE_SERVICE="/etc/systemd/system/yosoynathel-interactive.service"
sudo tee "$INTERACTIVE_SERVICE" >/dev/null <<EOF
[Unit]
Description=Next.js interactive app (yosoynathel)
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$DEPLOY_PATH/interactive
Environment=PORT=$NEXT_PORT
Environment=NODE_ENV=production
ExecStart=$BUN_PATH server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
echo "Systemd unit installed: $INTERACTIVE_SERVICE"

# --- Firewall ---
sudo ufw enable
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw status

# --- Certbot (HTTPS via Let's Encrypt) ---
if [[ "$SKIP_CERTBOT" != "1" ]]; then
  if command -v apt-get &>/dev/null; then
    if ! command -v certbot &>/dev/null; then
      echo "Installing certbot and python3-certbot-nginx..."
      sudo apt-get update -qq
      sudo apt-get install -y certbot python3-certbot-nginx
    else
      echo "Certbot already installed: $(certbot --version)"
    fi
  fi
  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN
fi

echo ""
echo "Setup complete."
echo ""
echo "  Deploy path:  $DEPLOY_PATH"
echo "  site/        Eleventy static files (deploy script rsyncs here)"
echo "  interactive/  Next.js app (deploy script rsyncs here)"
echo ""
echo "To enable and start the interactive app (system service):"
echo "  sudo systemctl enable --now yosoynathel-interactive"
echo ""
