export function getEnvList(name: string): string[] {
  const raw = process.env[name];
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function getAllowedEmailDomains(): string[] {
  return getEnvList("ALLOWED_EMAIL_DOMAINS");
}

export function getSeedAdminEmails(): string[] {
  return getEnvList("SEED_ADMIN_EMAILS");
}

