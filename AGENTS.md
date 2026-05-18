<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Overview
LottoUSA is a single Next.js 16 + Prisma 7 full-stack app (not a monorepo). It uses PostgreSQL as its only required service. The UI is in Thai.

### PostgreSQL setup
PostgreSQL must be running before the dev server or tests. On Cloud Agent VMs:
```
sudo pg_ctlcluster 16 main start
```
Create a dev database if it doesn't exist:
```
sudo -u postgres psql -c "CREATE USER lottodev WITH PASSWORD 'lottodev' SUPERUSER;" 2>/dev/null
sudo -u postgres psql -c "CREATE DATABASE lottodb OWNER lottodev;" 2>/dev/null
```
Then create a `.env` file in the repo root (it is gitignored):
```
DATABASE_URL="postgresql://lottodev:lottodev@localhost:5432/lottodb"
NEXTAUTH_SECRET="dev-secret-change-in-production-12345"
NEXTAUTH_URL="http://localhost:3000"
```

### Database migrations and seeding
```
npx prisma migrate dev      # apply schema to local DB
npm run db:seed              # seeds admin@lottousa.com (pw: admin1234) and test@example.com (pw: test1234)
```
**Gotcha**: The seed script (`prisma/seed.mjs`) uses `@prisma/adapter-pg` which reads `DATABASE_URL` at runtime. If run via `npm run db:seed` and dotenv isn't loading, pass the var explicitly: `DATABASE_URL="..." node prisma/seed.mjs`.

### Key commands
| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Unit tests | `npm test` (vitest, 82 tests) |
| Prisma Studio | `npm run db:studio` |

### Optional external services
Telegram bot, OpenAI OCR, and ExchangeRate API are optional and degrade gracefully. No secrets are required for basic dev work.
