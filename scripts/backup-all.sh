#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/backup-postgres.sh"
"$SCRIPT_DIR/backup-media.sh"
"$SCRIPT_DIR/backup-retention.sh"
