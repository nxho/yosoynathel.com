#!/usr/bin/env bash
#
# One-time server setup: create deploy dirs, install nginx (+ optional bun),
# write nginx config and a systemd unit for the Next.js photos app.
#
# Run on the server (e.g. after SSH):
#   curl -sSL https://raw.githubusercontent.com/.../setup-server.sh | bash
#   # or
#   bash setup-server.sh
#
# Options (env vars):
#   DEPLOY_PATH   Base path for site + photos (default: /var/www/yosoynathel.com)
#   DOMAIN        server_name for nginx (default: _)
#   NEXT_PORT     Port for Next app (default: 3001)
#   SKIP_NGINX    Set to 1 to skip nginx install/config
#   SKIP_NODE      Set to 1 to skip bun install
#
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/yosoynathel.com}"
DOMAIN="${DOMAIN:-yosoynathel.com}"
NEXT_PORT="${NEXT_PORT:-3001}"
SKIP_NGINX="${SKIP_NGINX:-0}"
SKIP_NODE="${SKIP_NODE:-0}"

# --- Directories ---
echo "Creating directories under $DEPLOY_PATH..."
sudo mkdir -p "$DEPLOY_PATH"/{site,photos}
sudo chown -R "$(whoami):" "$DEPLOY_PATH" 2>/dev/null || true

if command -v unzip &>/dev/null; then
  echo "Unzip already installed: $(unzip --version)"
else
  echo "Installing unzip..."
  sudo apt update -qq
  sudo apt install -y unzip
fi

# --- Node.js (for running Next.js photos app) ---
if [[ "$SKIP_NODE" != "1" ]]; then
  if command -v node &>/dev/null; then
    echo "Node.js already installed: $(node --version)"
  else
    echo "Installing Node.js..."
    if command -v apt-get &>/dev/null; then
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
      sudo apt-get install -y nodejs
    elif command -v dnf &>/dev/null; then
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
      sudo dnf install -y nodejs
    elif command -v yum &>/dev/null; then
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
      sudo yum install -y nodejs
    else
      echo "Could not detect package manager (apt-get, dnf, yum). Install Node.js manually and re-run with SKIP_NODE=1."
      exit 1
    fi
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
  if [[ -d /etc/nginx/sites-available ]]; then
    # Debian/Ubuntu
    sudo tee "$NGINX_CONF" >/dev/null <<EOF
# Static site (Eleventy) at root; Next.js photos app at /photos, /_next, /api, /uploads
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    root $DEPLOY_PATH/site;
    index index.html;
    location / {
        try_files \$uri \$uri/ \$uri.html =404;
    }

    # Strip /photos prefix so Next app sees path as /
    location /photos {
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
  else
    # RHEL-style: conf.d
    NGINX_CONF="/etc/nginx/conf.d/yosoynathel.conf"
    sudo tee "$NGINX_CONF" >/dev/null <<EOF
# Static site (Eleventy) at root; Next.js photos app at /photos, /_next, /api, /uploads
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    root $DEPLOY_PATH/site;
    index index.html;
    location / {
        try_files \$uri \$uri/ \$uri.html =404;
    }

    # Strip /photos prefix so Next app sees path as /
    location /photos {
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
  fi

  echo "Testing nginx config..."
  sudo nginx -t
  echo "Reloading nginx..."
  sudo systemctl reload nginx 2>/dev/null || sudo systemctl reload nginx.service
  echo "Nginx configured and reloaded."
fi

# --- Systemd user unit for Next.js photos app (optional) ---
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"
mkdir -p "$SYSTEMD_USER_DIR"
PHOTOS_SERVICE="$SYSTEMD_USER_DIR/yosoynathel-photos.service"
cat > "$PHOTOS_SERVICE" <<EOF
[Unit]
Description=Next.js photos app (yosoynathel)
After=network.target

[Service]
Type=simple
WorkingDirectory=$DEPLOY_PATH/photos
Environment=PORT=$NEXT_PORT
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

# If bun is in a different path, fix it
if command -v bun &>/dev/null; then
  BUN_PATH="$(command -v bun)"
  if [[ "$BUN_PATH" != "$HOME/.bun/bin/bun" ]]; then
    sed -i.bak "s|$HOME/.bun/bin/bun|$BUN_PATH|g" "$PHOTOS_SERVICE"
  fi
fi

# --- Certbot (HTTPS via Let's Encrypt) ---
if command -v apt-get &>/dev/null; then
  if ! command -v certbot &>/dev/null; then
    echo "Installing certbot and python3-certbot-nginx..."
    sudo apt-get update -qq
    sudo apt-get install -y certbot python3-certbot-nginx
  else
    echo "Certbot already installed: $(certbot --version)"
  fi
fi

sudo ufw enable
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw status
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

echo ""
echo "Setup complete."
echo ""
echo "  Deploy path:  $DEPLOY_PATH"
echo "  site/        Eleventy static files (deploy script rsyncs here)"
echo "  photos/      Next.js app (deploy script rsyncs here)"
echo ""
echo "Next steps:"
echo "  1. Deploy from your machine: DEPLOY_TARGET=user@this-server:$DEPLOY_PATH bun run deploy"
echo "  2. On this server, create $DEPLOY_PATH/photos/.env with PHOTOS_ADMIN_SECRET and any other env."
echo "  3. In $DEPLOY_PATH/photos run: bun install --production && bun run start"
echo "     Or enable the user systemd service and start it:"
echo "     systemctl --user daemon-reload"
echo "     systemctl --user enable --now yosoynathel-photos"
echo "  4. Ensure DEPLOY_PATH matches in this script and in DEPLOY_TARGET when you run deploy."
echo ""
