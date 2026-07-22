# Footballica

Mobile-first football trivia + club metagame (Next.js App Router).

## Local development

```bash
cp .env.example .env
# fill DATABASE_URL, AUTH_SECRET, CRON_SECRET, ADMIN_SECRET

npm install
npm run db:migrate:dev
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin?secret=…](http://localhost:3000/admin) (uses `ADMIN_SECRET`)
- Dev OTP: `123456`

## Production (Vercel)

1. Set env vars from `.env.example` (`DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `ADMIN_SECRET`).
2. Build Command: `npm run vercel-build` (applies `prisma migrate deploy`, then builds).
3. Cron (`vercel.json`) hits `/api/cron/duels` every minute with `Authorization: Bearer $CRON_SECRET`.
4. Unlock admin once with `/admin?secret=$ADMIN_SECRET`.

Useful scripts:

| Script | Purpose |
| --- | --- |
| `npm run db:deploy` | Apply migrations (production / CI) |
| `npm run db:migrate:dev` | Create + apply a migration locally |
| `npm run db:status` | Show migration status |
| `npm run vercel-build` | Migrate + build (Vercel) |

## Stack

Next.js · Tailwind · Framer Motion · Prisma · PostgreSQL · Zustand
