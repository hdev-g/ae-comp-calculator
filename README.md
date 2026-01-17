This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started (local)

For a quick “see it running” local preview (no DB/auth yet), see `docs/local-dev.md`.

1) Start Postgres (local)

This repo includes `docker-compose.yml` for local Postgres:

```bash
docker compose up -d
```

2) Create your local `.env`

Create a `.env` file and set at minimum:
- `DATABASE_URL`

See `docs/vercel-db.md` for details (and Vercel env var expectations).

3) Run migrations

```bash
npm run db:migrate:dev
```

4) Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

This project is intended to deploy on **Vercel** with a managed Postgres database.

See `docs/vercel-db.md`.
