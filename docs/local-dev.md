## Local development (preview the UI)

### 1) Ensure Node is available in your terminal

This project uses Node via **nvm**. If your terminal doesn’t have `node`/`npm` available after reopening it, add this to `~/.zshrc`:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

Then restart your terminal and verify:

```bash
node -v
npm -v
```

### 2) Install dependencies

From the project directory:

```bash
cd "/Users/harris/Code/Wordsmith/Comp Calculator/comp-calculator"
npm install
```

### 3) Start the dev server

```bash
npm run dev
```

Open: `http://localhost:3000`

### Notes

- You can preview the UI **without** a database or Google SSO hooked up yet.
- For database work later (recommended):
  - Use **Vercel Postgres** (no Docker needed): see `docs/vercel-postgres.md`.
  - Docker/local Postgres remains optional.

