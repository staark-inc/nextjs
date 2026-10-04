#!/usr/bin/env bash
set -Eeuo pipefail

STORAGE_ROOT="/srv/staark/saas/storage"
BACKUP_ROOT="/srv/staark/saas/backups"

MEDIA_DIR="$BACKUP_ROOT/media"
MANIFEST_DIR="$BACKUP_ROOT/manifests"
LOG_DIR="$BACKUP_ROOT/logs"

STAMP="$(date -u +'%Y%m%dT%H%M%SZ')"

ARCHIVE="$MEDIA_DIR/media-${STAMP}.tar.gz"
MANIFEST="$MANIFEST_DIR/media-${STAMP}.sha256"
FILELIST="$MANIFEST_DIR/media-${STAMP}.files"
LOG_FILE="$LOG_DIR/media-${STAMP}.log"

mkdir -p \
  "$MEDIA_DIR" \
  "$MANIFEST_DIR" \
  "$LOG_DIR"

if [ ! -d "$STORAGE_ROOT" ]; then
  echo "Storage root does not exist: $STORAGE_ROOT" >&2
  exit 1
fi

echo "[$(date -u +'%FT%TZ')] Starting media backup" \
  | tee -a "$LOG_FILE"

find "$STORAGE_ROOT" \
  -type f \
  -printf '%P\n' \
  | sort \
  > "$FILELIST"

tar \
  -C "$STORAGE_ROOT" \
  -czf "$ARCHIVE" \
  .

if [ ! -s "$ARCHIVE" ]; then
  echo "Media archive is empty." | tee -a "$LOG_FILE"
  rm -f "$ARCHIVE"
  exit 1
fi

sha256sum "$ARCHIVE" > "$MANIFEST"

echo "[$(date -u +'%FT%TZ')] Media backup complete" \
  | tee -a "$LOG_FILE"

echo "FILE=$ARCHIVE" | tee -a "$LOG_FILE"
echo "SIZE=$(du -h "$ARCHIVE" | awk '{print $1}')" \
  | tee -a "$LOG_FILE"
echo "FILES=$(wc -l < "$FILELIST")" \
  | tee -a "$LOG_FILE"
echo "SHA256=$(cut -d' ' -f1 "$MANIFEST")" \
  | tee -a "$LOG_FILE"
