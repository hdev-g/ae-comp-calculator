import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";

function fileHasDatabaseUrl(path) {
  try {
    if (!existsSync(path)) return false;
    const txt = readFileSync(path, "utf8");
    return /^DATABASE_URL\s*=.+/m.test(txt);
  } catch {
    return false;
  }
}

const hasEnvVar = Boolean(process.env.DATABASE_URL);
const envFile = existsSync(".env.local") ? ".env.local" : ".env";
const hasInFile = fileHasDatabaseUrl(envFile);

if (!hasEnvVar && !hasInFile) {
  console.log("[postinstall] Skipping `prisma generate` (DATABASE_URL is not set).");
  process.exit(0);
}

console.log("[postinstall] Running `prisma generate`...");

// In local dev, DATABASE_URL often lives in .env.local (Next.js loads it, Prisma CLI does not).
// So we load it explicitly via dotenv-cli if needed.
if (!hasEnvVar && hasInFile) {
  execSync(`npx dotenv -e ${envFile} -- npx prisma generate`, { stdio: "inherit" });
} else {
  execSync("npx prisma generate", { stdio: "inherit" });
}

