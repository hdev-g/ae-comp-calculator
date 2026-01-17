## Using Vercel Postgres (recommended)

This project is intended to use **Vercel Postgres** for both preview and production, and optionally for local development as well.

### 1) Provision Vercel Postgres

- In Vercel: Project → **Storage** → **Postgres** → Create
- Vercel will add environment variables to your project automatically.

Typical variables you’ll see include `DATABASE_URL` and `DIRECT_URL` (names can vary depending on the integration).

### 2) Pull env vars locally (Vercel CLI)

Install Vercel CLI and link the project:

```bash
npm i -g vercel
vercel login
vercel link
```

Then pull env vars:

```bash
vercel env pull .env.local
```

Notes:
- `.env.local` is gitignored (good).
- In this Cursor environment, the assistant can’t edit `.env*` files, but **you can create/edit them normally**.

### 3) Prisma env expectations

For Prisma with managed Postgres, it’s best practice to have:
- **`DATABASE_URL`**: app/runtime connection string (often pooled)
- **`DIRECT_URL`**: direct/unpooled connection string (used for migrations)

If your integration only gives you one, you can temporarily set `DIRECT_URL` equal to `DATABASE_URL` for early MVP work.

### 4) Run migrations

After you have `DATABASE_URL` set locally:

```bash
npm run db:migrate:dev
```

On Vercel deployments, run:

```bash
npm run db:migrate:deploy
```

