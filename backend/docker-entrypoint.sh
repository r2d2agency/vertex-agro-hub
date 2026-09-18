#!/bin/sh
set -eu

# The database may take a few seconds to accept connections on first deploy.
# Retry migrations before starting the API so a fresh database is initialized.
attempt=1
while [ "$attempt" -le 30 ]; do
  if npx prisma migrate resolve --rolled-back 20260909160000_fleet_movements_farm_id >/dev/null 2>&1 || true; npx prisma migrate deploy; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "Prisma migrations failed after 30 attempts" >&2
    exit 1
  fi
  echo "Waiting for the database before retrying Prisma migrations ($attempt/30)..." >&2
  attempt=$((attempt + 1))
  sleep 2
done

exec node dist/main.js
