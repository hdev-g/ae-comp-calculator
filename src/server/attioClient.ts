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

  return res.json() as Promise<any>;
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

  const items: any[] =
    data?.data ??
    data?.workspace_members ??
    data?.members ??
    [];

  for (const m of items) {
    const memberEmail =
      (m?.email ?? m?.attributes?.email ?? m?.user?.email ?? "").toString().toLowerCase();
    if (memberEmail === normalized) {
      return {
        id: (m?.id ?? m?.workspace_member_id ?? m?.workspaceMemberId ?? "").toString(),
        email: memberEmail,
        name: (m?.name ?? m?.full_name ?? m?.fullName ?? null) as string | null,
      };
    }
  }

  return null;
}

