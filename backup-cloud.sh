#!/bin/bash
# Backup automático: local + cloud (via rclone). Para Umbrel/Linux.
# Configure RCLONE_REMOTE no .env ou aqui:
set -e
cd "$(dirname "$0")"

STAMP=$(date +%Y-%m-%d_%H%M)
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:Fundos-Backup}"
RETENCAO=30

mkdir -p backups

# Local
if [ -f data.db ]; then
  cp data.db "backups/data-$STAMP.db"
  echo "Backup local: backups/data-$STAMP.db"
fi

# Export JSON via API (se servidor está rodando)
if curl -fs -o "backups/export-$STAMP.json" http://localhost:3000/api/export 2>/dev/null; then
  SIZE=$(stat -c %s "backups/export-$STAMP.json" 2>/dev/null || echo 0)
  if [ "$SIZE" -lt 100 ]; then
    rm -f "backups/export-$STAMP.json"
  else
    echo "Export JSON: backups/export-$STAMP.json"
  fi
fi

# Cloud (se rclone configurado)
if command -v rclone >/dev/null; then
  echo "Enviando para $RCLONE_REMOTE..."
  rclone copy "backups/data-$STAMP.db" "$RCLONE_REMOTE/" --quiet
  [ -f "backups/export-$STAMP.json" ] && rclone copy "backups/export-$STAMP.json" "$RCLONE_REMOTE/" --quiet
  rclone delete "$RCLONE_REMOTE/" --min-age "${RETENCAO}d" --quiet 2>/dev/null || true
  echo "Cloud OK (retenção ${RETENCAO} dias)"
else
  echo "rclone não instalado — apenas backup local. Veja BACKUP.md."
fi

# Retenção local: 14 mais recentes
ls -t backups/data-*.db 2>/dev/null | tail -n +15 | xargs -r rm
ls -t backups/export-*.json 2>/dev/null | tail -n +15 | xargs -r rm
