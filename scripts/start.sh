#!/bin/sh
set -e
echo "=== Seeding database ==="
npx prisma db seed
echo "=== Starting Next.js on PORT=$PORT ==="
exec node_modules/.bin/next start -H 0.0.0.0
