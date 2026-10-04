#!/bin/sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
FILE="${1:?usage: ./scripts/restore.sh backup.dump}"
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$FILE"
printf 'Restore selesai dari %s\n' "$FILE"
