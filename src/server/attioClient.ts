type AttioWorkspaceMember = {
  id: string;
  email?: string | null;
  name?: string | null;
};

function getBaseUrl() {
  return process.env.ATTIO_API_BASE_URL ?? "https://api.attio.com/v2";
}

function getApiKey() {
  return process.env.ATTIO_API_KEY;
}

async function attioFetch(path: string, init?: RequestInit) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("ATTIO_API_KEY is not set");

  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    // Avoid Next caching for auth/link flows
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Attio API error ${res.status} ${res.statusText}: ${text}`);
  }

  return (await res.json()) as unknown;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function getString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function getMembersArray(data: unknown): unknown[] {
  const rec = asRecord(data);
  if (!rec) return [];
  const candidate = rec["data"] ?? rec["workspace_members"] ?? rec["members"];
  return Array.isArray(candidate) ? candidate : [];
}

/**
 * Best-effort lookup. We list workspace members and match by email.
 * Requires Attio API key with permissions that include user management read.
 */
export async function findWorkspaceMemberByEmail(email: string): Promise<AttioWorkspaceMember | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  // Endpoint naming based on Attio's v2 REST patterns. If your workspace uses a different route,
  // we can adjust once you confirm the exact endpoint/response shape from Attio docs.
  const data = await attioFetch("/workspace_members");

  const items = getMembersArray(data);

  for (const item of items) {
    const m = asRecord(item);
    if (!m) continue;

    const attributes = asRecord(m["attributes"]);
    const user = asRecord(m["user"]);

    const memberEmail =
      (getString(m["email"]) ?? getString(attributes?.["email"]) ?? getString(user?.["email"]) ?? "")
        .toString()
        .toLowerCase();
    if (memberEmail === normalized) {
      return {
        id: (
          getString(m["id"]) ??
          getString(m["workspace_member_id"]) ??
          getString(m["workspaceMemberId"]) ??
          ""
        ).toString(),
        email: memberEmail,
        name: (getString(m["name"]) ?? getString(m["full_name"]) ?? getString(m["fullName"]) ?? null) as
          | string
          | null,
      };
    }
  }

  return null;
}

