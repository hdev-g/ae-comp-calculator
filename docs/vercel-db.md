## Vercel hosting + database notes

This app is designed to deploy on **Vercel** and use a managed Postgres database (recommended: **Vercel Postgres**).

### Local development

You can either:
- Use **Vercel Postgres locally** by pulling env vars (recommended): see `docs/vercel-postgres.md`
- Or run Postgres locally (Docker)

Run migrations:

```bash
npm run db:migrate:dev
```

### Vercel (production / preview)

- Provision a Postgres database (Vercel Postgres).
- In Vercel Project Settings → Environment Variables, set **`DATABASE_URL`** (and auth/Attio vars).
- Apply migrations in the deployment pipeline:

```bash
npm run db:migrate:deploy
```

Notes:
- Prisma is used in a **serverless-safe singleton** (`src/server/db.ts`) to reduce connection churn on Vercel.
- If you later choose to run route handlers on the Edge runtime, we’ll need to switch to Prisma Accelerate / Data Proxy (Node runtime is fine for MVP).

