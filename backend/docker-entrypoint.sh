#!/bin/sh
set -e
if [ -n "${SKIP_PRISMA_MIGRATE:-}" ]; then
  echo "SKIP_PRISMA_MIGRATE set — skipping prisma migrate deploy"
else
  echo "Applying Prisma migrations..."
  npx prisma migrate deploy
fi
exec "$@"
