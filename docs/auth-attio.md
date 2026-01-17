## Google SSO + Attio workspace integration (auto-link by email)

### Overview

- Users sign in with **Google** (NextAuth).
- Access can be restricted by **allowed email domain(s)**.
- On successful sign-in, the backend **upserts** a `User` record (by `googleSub`) and ensures an `AEProfile`.
- If `ATTIO_API_KEY` is set, we try to **find the Attio workspace member by email** and store the member id on `AEProfile.attioWorkspaceMemberId`.

### Required env vars (Vercel)

- `NEXTAUTH_SECRET` (preferred; for NextAuth v4)
- `NEXTAUTH_URL` (your deployed URL, e.g. `https://ae-comp-calculator.vercel.app`)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ALLOWED_EMAIL_DOMAINS` (comma-separated, e.g. `wordsmith.ai`)
- `SEED_ADMIN_EMAILS` (comma-separated; these become `ADMIN`)
- `ATTIO_API_KEY` (workspace API key)
- Optional: `ATTIO_API_BASE_URL` (defaults to `https://api.attio.com/v2`)

### Notes

- This repo uses **NextAuth v4**. If you already set `AUTH_SECRET` (Auth.js v5-style), the app will also accept it, but `NEXTAUTH_SECRET` is the canonical name.
- If `ATTIO_API_KEY` is **not** set, sign-in still works; Attio linkage is skipped.
- The Attio member lookup currently uses a **list-and-filter** approach via a presumed `GET /workspace_members` route. If your Attio workspace exposes a different route/shape, we’ll update `src/server/attioClient.ts` once you confirm the endpoint.

