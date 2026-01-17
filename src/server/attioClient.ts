type AttioWorkspaceMember = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type AttioDealParsed = {
  attioRecordId: string;
  dealName: string;
  accountName?: string | null;
  amount: number;
  commissionableAmount: number;
  closeDate: string; // ISO
  status: string;
  ownerWorkspaceMemberId?: string | null;
  raw: unknown;
};

function getBaseUrl() {
  return process.env.ATTIO_API_BASE_URL ?? "https://api.attio.com/v2";
}

function getApiKey() {
  return process.env.ATTIO_API_KEY;
}

function getWorkspaceMembersPath() {
  return process.env.ATTIO_WORKSPACE_MEMBERS_PATH ?? "/workspace_members";
}

function getDealsPath() {
  // Default assumption; configurable because Attio API shapes vary by workspace/setup.
  // Attio commonly exposes record listing via a "query" endpoint.
  return process.env.ATTIO_DEALS_PATH ?? "/objects/deals/records/query";
}

function getDealsInclude(): string[] {
  // Keep payloads small: we only need these fields to power "Wins" and AE mapping.
  const raw = process.env.ATTIO_DEALS_QUERY_INCLUDE;
  if (raw && raw.trim()) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [
    "id",
    "created_at",
    "web_url",
    "values.record_id",
    "values.name",
    "values.owner",
    "values.stage",
    "values.deal_forecast",
    "values.value",
    "values.won_loss_date",
    "values.estimated_close_date",
    "values.deal_value_local",
    "values.associated_company",
  ];
}

function getWonFilter(): Record<string, unknown> | null {
  // Best-effort: Attio filters are workspace-specific. If you provide IDs, we can filter server-side.
  // You can copy these ids from a record payload:
  // - stage status: data.values.stage[0].status.id.status_id
  // - deal_forecast option: data.values.deal_forecast[0].option.id.option_id
  const stageStatusId = process.env.ATTIO_WON_STAGE_STATUS_ID?.trim();
  const forecastOptionId = process.env.ATTIO_WON_FORECAST_OPTION_ID?.trim();

  const clauses: Record<string, unknown>[] = [];

  if (stageStatusId) {
    clauses.push({
      path: [["stage"]],
      constraints: { status_id: stageStatusId },
    });
  }

  if (forecastOptionId) {
    clauses.push({
      path: [["deal_forecast"]],
      constraints: { option_id: forecastOptionId },
    });
  }

  if (clauses.length === 0) return null;
  if (clauses.length === 1) return clauses[0]!;

  // Combine if both are provided.
  return { operator: "and", clauses };
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

function getArray(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

function getNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function getValuesRecord(record: Record<string, unknown>): Record<string, unknown> | null {
  // Attio often returns records like: { data: { values: { ... } } }
  const values =
    asRecord(record["values"]) ??
    asRecord(asRecord(record["data"])?.["values"]) ??
    asRecord(asRecord(record["data"])?.["record"] as unknown)?.["values"];
  return values ? (values as Record<string, unknown>) : null;
}

function pickFirstValue(values: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const arr = getArray(values[key]);
  if (!arr || arr.length === 0) return null;
  return asRecord(arr[0]) ?? null;
}

function pickTextValue(values: Record<string, unknown>, key: string): string | null {
  const first = pickFirstValue(values, key);
  return getString(first?.["value"]) ?? null;
}

function pickStatusTitle(values: Record<string, unknown>, key: string): string | null {
  const first = pickFirstValue(values, key);
  const status = asRecord(first?.["status"]);
  return getString(status?.["title"]) ?? null;
}

function pickOptionTitle(values: Record<string, unknown>, key: string): string | null {
  const first = pickFirstValue(values, key);
  const option = asRecord(first?.["option"]);
  return getString(option?.["title"]) ?? null;
}

function pickCurrencyValue(values: Record<string, unknown>, key: string): number | null {
  const first = pickFirstValue(values, key);
  return getNumber(first?.["currency_value"]) ?? getNumber(first?.["currencyValue"]) ?? null;
}

function pickDateValue(values: Record<string, unknown>, key: string): string | null {
  const first = pickFirstValue(values, key);
  return getString(first?.["value"]) ?? null;
}

function getMembersArray(data: unknown): unknown[] {
  const rec = asRecord(data);
  if (!rec) return [];
  const candidate = rec["data"] ?? rec["workspace_members"] ?? rec["members"];
  return Array.isArray(candidate) ? candidate : [];
}

function getDealsArray(data: unknown): unknown[] {
  const rec = asRecord(data);
  if (!rec) return [];
  const dataNode = rec["data"];
  const dataRec = asRecord(dataNode);
  const candidate =
    (dataRec ? dataRec["records"] ?? dataRec["data"] : null) ??
    rec["records"] ??
    rec["deals"] ??
    rec["data"];
  return Array.isArray(candidate) ? candidate : [];
}

/**
 * Best-effort lookup. We list workspace members and match by email.
 * Requires Attio API key with permissions that include user management read.
 */
export async function findWorkspaceMemberByEmail(email: string): Promise<AttioWorkspaceMember | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const data = await attioFetch(getWorkspaceMembersPath());

  const items = getMembersArray(data);

  for (const item of items) {
    const m = asRecord(item);
    if (!m) continue;

    const memberEmail =
      (getString(m["email"]) ??
        getString(m["email_address"]) ??
        getString(asRecord(m["attributes"])?.["email"]) ??
        getString(asRecord(m["user"])?.["email"]) ??
        "")
        .toString()
        .toLowerCase();
    if (memberEmail === normalized) {
      const idObj = asRecord(m["id"]);
      return {
        id:
          (getString(m["id"]) ??
            getString(idObj?.["workspace_member_id"]) ??
            getString(idObj?.["workspaceMemberId"]) ??
            getString(m["workspace_member_id"]) ??
            getString(m["workspaceMemberId"]) ??
            "")?.toString() ?? "",
        email: memberEmail,
        name:
          (getString(m["name"]) ??
            getString(m["full_name"]) ??
            getString(m["fullName"]) ??
            [getString(m["first_name"]), getString(m["last_name"])].filter(Boolean).join(" ").trim() ??
            null) as string | null,
      };
    }
  }

  return null;
}

export async function listWorkspaceMembersRaw(): Promise<unknown[]> {
  const data = await attioFetch(getWorkspaceMembersPath());
  return getMembersArray(data);
}

function tryParseOwnerWorkspaceMemberId(record: Record<string, unknown>): string | null {
  // Common pattern mentioned: actor reference { referenced_actor_type: "workspace-member", referenced_actor_id: "<uuid>" }
  // Newer Attio record shape stores owner under values.owner[].
  const values = getValuesRecord(record);
  if (values) {
    const first = pickFirstValue(values, "owner");
    if (first) {
      const rat = getString(first["referenced_actor_type"]) ?? getString(first["referencedActorType"]);
      const rai = getString(first["referenced_actor_id"]) ?? getString(first["referencedActorId"]);
      if (rat && rat.toLowerCase() === "workspace-member" && rai) return rai;
    }
  }

  const owner =
    asRecord(record["owner"]) ??
    asRecord(record["deal_owner"]) ??
    asRecord(asRecord(record["attributes"])?.["owner"]);
  if (!owner) return null;

  const rat = getString(owner["referenced_actor_type"]) ?? getString(owner["referencedActorType"]);
  const rai = getString(owner["referenced_actor_id"]) ?? getString(owner["referencedActorId"]);
  if (rat && rat.toLowerCase() === "workspace-member" && rai) return rai;

  // Fallbacks: sometimes owner is a direct id or nested object with id.
  return getString(owner["id"]) ?? getString(asRecord(owner["data"])?.["id"]) ?? null;
}

/**
 * Minimal “best effort” deal parsing.
 * Because Attio fields vary, this uses a few common fallbacks and stores raw payload for debugging.
 * You can refine mappings later via env vars once we confirm your exact Attio schema.
 */
export function parseDealRecord(raw: unknown): AttioDealParsed | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const values = getValuesRecord(rec);

  const idObj = asRecord(rec["id"]);
  const attioRecordId =
    getString(rec["id"]) ??
    getString(idObj?.["record_id"]) ??
    getString(idObj?.["recordId"]) ??
    getString(rec["record_id"]) ??
    getString(rec["recordId"]) ??
    (values ? pickTextValue(values, "record_id") : null) ??
    null;
  if (!attioRecordId) return null;

  const attributes = asRecord(rec["attributes"]) ?? rec;

  const dealName =
    (values ? pickTextValue(values, "name") : null) ??
    getString(rec["deal_name"]) ??
    getString(rec["name"]) ??
    getString(attributes?.["deal_name"]) ??
    getString(attributes?.["name"]) ??
    "Untitled deal";

  // Attio record references (e.g. associated_company) only include target_record_id in the record payload.
  // We'll keep accountName optional until we also sync companies and resolve names.
  const accountName =
    getString(rec["account_name"]) ??
    getString(attributes?.["account_name"]) ??
    getString(attributes?.["company_name"]) ??
    null;

  const amount =
    (values ? pickCurrencyValue(values, "value") : null) ??
    (values ? getNumber(pickFirstValue(values, "deal_value_local")?.["value"]) : null) ??
    getNumber(rec["amount"]) ??
    getNumber(attributes?.["amount"]) ??
    0;
  const commissionableAmount =
    getNumber(rec["commissionable_amount"]) ??
    getNumber(attributes?.["commissionable_amount"]) ??
    amount;

  const closeDateRaw =
    (values ? pickDateValue(values, "won_loss_date") : null) ??
    (values ? pickDateValue(values, "estimated_close_date") : null) ??
    getString(rec["close_date"]) ??
    getString(attributes?.["close_date"]) ??
    getString(attributes?.["closed_at"]) ??
    null;

  const closeDate =
    closeDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(closeDateRaw)
      ? new Date(`${closeDateRaw}T00:00:00.000Z`).toISOString()
      : closeDateRaw;

  const status =
    (values ? pickStatusTitle(values, "stage") : null) ??
    (values ? pickOptionTitle(values, "deal_forecast") : null) ??
    getString(rec["status"]) ??
    getString(attributes?.["status"]) ??
    getString(attributes?.["stage"]) ??
    "";

  const ownerWorkspaceMemberId = tryParseOwnerWorkspaceMemberId(rec);

  return {
    attioRecordId,
    dealName,
    accountName,
    amount,
    commissionableAmount,
    closeDate: closeDate ?? new Date(0).toISOString(),
    status,
    ownerWorkspaceMemberId,
    raw,
  };
}

export async function listDealsRaw(): Promise<unknown[]> {
  const path = getDealsPath();

  // If this is a query-style endpoint, use POST and attempt basic pagination.
  if (path.endsWith("/query")) {
    const all: unknown[] = [];
    let cursor: string | null = null;
    const include = getDealsInclude();
    const wonFilter = getWonFilter();

    const onlyWon = (process.env.ATTIO_DEALS_ONLY_WON ?? "true").toLowerCase() !== "false";

    for (let i = 0; i < 50; i++) {
      const body: Record<string, unknown> = { limit: 200, include };
      if (cursor) body["cursor"] = cursor;
      if (onlyWon && wonFilter) body["filter"] = wonFilter;

      let data: unknown;
      try {
        data = await attioFetch(path, { method: "POST", body: JSON.stringify(body) });
      } catch (e) {
        // If Attio rejects our filter shape, fall back to unfiltered query so sync still works.
        const msg = e instanceof Error ? e.message : "";
        const isBadRequest = msg.includes("Attio API error 400") || msg.includes("Attio API error 422");
        if (onlyWon && wonFilter && isBadRequest) {
          console.warn("[attio] deals query filter rejected; falling back to unfiltered query");
          const fallbackBody: Record<string, unknown> = { limit: 200, include };
          if (cursor) fallbackBody["cursor"] = cursor;
          data = await attioFetch(path, { method: "POST", body: JSON.stringify(fallbackBody) });
        } else {
          throw e;
        }
      }
      const batch = getDealsArray(data);
      all.push(...batch);

      const rec = asRecord(data);
      const next =
        getString(rec?.["next_cursor"]) ??
        getString(rec?.["nextCursor"]) ??
        getString(asRecord(rec?.["data"])?.["next_cursor"]) ??
        getString(asRecord(rec?.["data"])?.["nextCursor"]) ??
        null;

      if (!next) break;
      cursor = next;
    }

    return all;
  }

  const data = await attioFetch(path);
  return getDealsArray(data);
}

