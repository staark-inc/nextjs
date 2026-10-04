#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_ROOT="/srv/staark/saas/backups"
DB_DIR="$BACKUP_ROOT/database"
MANIFEST_DIR="$BACKUP_ROOT/manifests"
LOG_DIR="$BACKUP_ROOT/logs"

CONTAINER="staark-postgres"
DB_USER="staark_saas_admin"
DB_NAME="staark_saas"

STAMP="$(date -u +'%Y%m%dT%H%M%SZ')"
BACKUP_FILE="$DB_DIR/${DB_NAME}-${STAMP}.dump"
MANIFEST_FILE="$MANIFEST_DIR/${DB_NAME}-${STAMP}.sha256"
LOG_FILE="$LOG_DIR/postgres-${STAMP}.log"

mkdir -p "$DB_DIR" "$MANIFEST_DIR" "$LOG_DIR"

echo "[$(date -u +'%FT%TZ')] Starting PostgreSQL backup" | tee -a "$LOG_FILE"

sudo docker exec "$CONTAINER" \
  pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -Fc \
    --no-owner \
    --no-privileges \
  > "$BACKUP_FILE"

if [ ! -s "$BACKUP_FILE" ]; then
  echo "Backup file is empty." | tee -a "$LOG_FILE"
  rm -f "$BACKUP_FILE"
  exit 1
fi

sha256sum "$BACKUP_FILE" > "$MANIFEST_FILE"

echo "[$(date -u +'%FT%TZ')] Backup complete" | tee -a "$LOG_FILE"
echo "FILE=$BACKUP_FILE" | tee -a "$LOG_FILE"
echo "SIZE=$(du -h "$BACKUP_FILE" | awk '{print $1}')" | tee -a "$LOG_FILE"
echo "SHA256=$(cut -d' ' -f1 "$MANIFEST_FILE")" | tee -a "$LOG_FILE"
