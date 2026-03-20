#!/usr/bin/env bash
# Tail logs from the yosoynathel-interactive service.
#
# On the server: ./scripts/tail-logs.sh
# From local:    DEPLOY_TARGET=user@host:/var/www/yosoynathel.com ./scripts/tail-logs.sh

set -e

if [[ -n "$DEPLOY_TARGET" && "$DEPLOY_TARGET" == *:* ]]; then
  SSH_TARGET="${DEPLOY_TARGET%%:*}"
  exec ssh -t "$SSH_TARGET" "sudo journalctl -u yosoynathel-interactive -f"
else
  exec sudo journalctl -u yosoynathel-interactive -f
fi
