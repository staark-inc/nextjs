#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/srv/staark/saas/backups"
RETENTION_DAYS=14

find "$ROOT/database" \
  -type f \
  -name '*.dump' \
  -mtime +"$RETENTION_DAYS" \
  -delete

find "$ROOT/media" \
  -type f \
  -name '*.tar.gz' \
  -mtime +"$RETENTION_DAYS" \
  -delete

find "$ROOT/manifests" \
  -type f \
  \( -name '*.sha256' -o -name '*.files' \) \
  -mtime +"$RETENTION_DAYS" \
  -delete

find "$ROOT/logs" \
  -type f \
  -name '*.log' \
  -mtime +"$RETENTION_DAYS" \
  -delete
