#!/usr/bin/env bash
# Rotate PHOTOS_ADMIN_SECRET on the remote server using generate-admin-key.ts,
# then restart the photos service so the app picks up the new key.
#
# Requires: DEPLOY_TARGET (e.g. "user@host:/var/www/yosoynathel.com")
#
# Run from repo root: DEPLOY_TARGET=user@host:/var/www/yosoynathel.com ./scripts/rotate-admin-key.sh

set -e

if [[ -z "$DEPLOY_TARGET" || "$DEPLOY_TARGET" != *:* ]]; then
  echo "Set DEPLOY_TARGET (e.g. user@host:/var/www/yosoynathel.com)" >&2
  exit 1
fi

SSH_TARGET="${DEPLOY_TARGET%%:*}"
REMOTE_PATH="${DEPLOY_TARGET#*:}"

echo "Rotating admin key on $SSH_TARGET (path: $REMOTE_PATH)..."
ssh "$SSH_TARGET" "cd $REMOTE_PATH && bun run scripts/generate-admin-key.ts && systemctl --user restart yosoynathel-photos"
echo "Done. Admin key rotated and photos service restarted."
