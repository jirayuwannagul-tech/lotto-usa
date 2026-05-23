#!/bin/sh
set -e

if [ "${RUN_DB_MIGRATIONS:-0}" = "1" ]; then
  echo "=== Running prisma db push ==="
  npx prisma db push --accept-data-loss
fi

if [ "${RUN_DB_SEED:-0}" = "1" ]; then
  echo "=== Running prisma db seed ==="
  npx prisma db seed
fi

echo "=== Starting Next.js on PORT=$PORT ==="
exec node_modules/.bin/next start -H 0.0.0.0
