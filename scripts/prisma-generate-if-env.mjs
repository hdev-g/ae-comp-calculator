import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[postinstall] Skipping `prisma generate` (DATABASE_URL is not set).");
  process.exit(0);
}

console.log("[postinstall] Running `prisma generate`...");
execSync("npx prisma generate", { stdio: "inherit" });

