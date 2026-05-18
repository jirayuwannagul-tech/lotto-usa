<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Next.js dev server | `npm run dev` | Runs on port 3000 |
| PostgreSQL | `sudo pg_ctlcluster 16 main start` | Must be running before dev server |

### Environment

- `.env` must exist at project root with `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`.
- Local dev database: `postgresql://lottodev:lottodev123@localhost:5432/lottousadev` (user has CREATEDB privilege for Prisma shadow DB).
- The seed script (`npm run db:seed`) does NOT auto-load `.env`; pass `DATABASE_URL` explicitly or source it before running.

### Commands

- **Lint:** `npm run lint`
- **Tests:** `npm run test` (Vitest, 82 tests, no DB needed)
- **Migrations:** `npx prisma migrate dev`
- **Seed:** `DATABASE_URL="..." npm run db:seed`
- **Dev server:** `npm run dev`

### Gotchas

- Prisma uses `@prisma/adapter-pg` (driver adapter mode). The Prisma config is in `prisma.config.ts` which loads `dotenv/config`.
- `prisma migrate dev` needs shadow DB creation privileges — the DB user must have `CREATEDB`.
- Optional services (OpenAI, Telegram, Exchange Rate API) gracefully degrade without API keys.
- Demo credentials: admin `admin@lottousa.com` / `admin1234`, customer `test@example.com` / `test1234`.
