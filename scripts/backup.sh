#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
pg_dump "$DATABASE_URL" -Fc -f "$OUT_DIR/siprima-pas-$STAMP.dump"
find "$OUT_DIR" -type f -name 'siprima-pas-*.dump' -mtime +30 -delete
printf 'Backup dibuat: %s\n' "$OUT_DIR/siprima-pas-$STAMP.dump"
