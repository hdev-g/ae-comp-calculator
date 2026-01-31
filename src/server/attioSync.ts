import { listDealsRaw, listWorkspaceMembersRaw, parseDealRecord } from "@/server/attioClient";
import { reconcileDealsToAEs } from "@/server/aeDealAssignment";
import { reconcileUsersToAttioByEmail } from "@/server/userAttioLinking";
import { prisma } from "@/server/db";
import type { Prisma } from "@/generated/prisma";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function pickString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function extractWorkspaceMemberId(raw: unknown): string | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const direct =
    pickString(rec["id"], rec["workspace_member_id"], rec["workspaceMemberId"]) ??
    pickString(asRecord(rec["data"])?.["id"], asRecord(rec["data"])?.["workspace_member_id"]);

  if (direct) return direct;

  // Sometimes `id` is nested, e.g. { id: "<uuid>" } or { workspace_member_id: "<uuid>" }.
  const idObj = asRecord(rec["id"]);
  if (idObj) {
    return (
      pickString(idObj["id"], idObj["workspace_member_id"], idObj["workspaceMemberId"]) ??
      pickString(asRecord(idObj["data"])?.["id"], asRecord(idObj["data"])?.["workspace_member_id"])
    );
  }

  return null;
}

export type AttioSyncResult = {
  membersFetched: number;
  dealsFetched: number;
  dealsParsed: number;
  membersUpserted: number;
  dealsUpserted: number;
  dealsAssigned: number;
  aeProfilesLinked: number;
  aeProfilesUpdated: number;
  aeLinkConflicts: number;
};

type ParsedDeal = {
  attioRecordId: string;
  dealName: string;
  accountName: string | null;
  amount: number;
  commissionableAmount: number;
  closeDate: string;
  status: string;
  ownerWorkspaceMemberId: string | null;
  raw: unknown;
};

/**
 * Auto-applies bonus rules to deals based on Attio attribute mappings.
 * If a bonus rule has an attioAttributeId configured and the deal's Attio
 * attribute value is true/checked, the bonus rule is applied to the deal.
 */
async function applyBonusRulesFromAttioAttributes(parsedDeals: (ParsedDeal | null)[]): Promise<void> {
  // Get all bonus rules with Attio attribute mappings
  const bonusRulesWithAttio = await prisma.bonusRule.findMany({
    where: {
      attioAttributeId: { not: null },
      enabled: true,
    },
    select: {
      id: true,
      attioAttributeId: true,
      commissionPlan: {
        select: {
          aeProfiles: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (bonusRulesWithAttio.length === 0) return;

  // Build a map of attioAttributeId -> bonus rule IDs
  const attrToRules = new Map<string, string[]>();
  for (const rule of bonusRulesWithAttio) {
    if (!rule.attioAttributeId) continue;
    const existing = attrToRules.get(rule.attioAttributeId) ?? [];
    existing.push(rule.id);
    attrToRules.set(rule.attioAttributeId, existing);
  }

  // Process each deal
  for (const deal of parsedDeals) {
    if (!deal) continue;

    const dbDeal = await prisma.deal.findUnique({
      where: { attioRecordId: deal.attioRecordId },
      select: { id: true, aeProfileId: true, appliedBonusRuleIds: true },
    });
    if (!dbDeal) continue;

    // Get the AE's commission plan's bonus rules
    let eligibleRuleIds: string[] = [];
    if (dbDeal.aeProfileId) {
      const aeProfile = await prisma.aEProfile.findUnique({
        where: { id: dbDeal.aeProfileId },
        select: {
          commissionPlan: {
            select: {
              bonusRules: {
                where: { 
                  attioAttributeId: { not: null },
                  enabled: true,
                },
                select: { id: true, attioAttributeId: true },
              },
            },
          },
        },
      });
      eligibleRuleIds = aeProfile?.commissionPlan?.bonusRules.map(r => r.id) ?? [];
    }

    // Check the raw Attio payload for attribute values
    const raw = asRecord(deal.raw);
    const values = asRecord(raw?.values) ?? asRecord(raw?.attributes) ?? raw;
    
    // appliedBonusRuleIds is stored as JSON array of strings
    const existingRuleIds = Array.isArray(dbDeal.appliedBonusRuleIds) 
      ? (dbDeal.appliedBonusRuleIds as string[]) 
      : [];
    const appliedRuleIds = new Set<string>(existingRuleIds);

    for (const [attrId, ruleIds] of attrToRules.entries()) {
      // Check if attribute value is truthy (checkbox checked)
      const attrValue = extractAttributeValue(values, attrId);
      
      for (const ruleId of ruleIds) {
        // Only apply rules that the AE is eligible for
        if (eligibleRuleIds.length > 0 && !eligibleRuleIds.includes(ruleId)) continue;
        
        if (attrValue === true) {
          appliedRuleIds.add(ruleId);
        }
        // Note: We don't remove rules if attr is false, since they could be manually applied
      }
    }

    // Update the deal if appliedBonusRuleIds changed
    const newAppliedRuleIds = Array.from(appliedRuleIds);
    if (newAppliedRuleIds.length !== existingRuleIds.length ||
        !newAppliedRuleIds.every(id => existingRuleIds.includes(id))) {
      await prisma.deal.update({
        where: { id: dbDeal.id },
        data: { appliedBonusRuleIds: newAppliedRuleIds },
      });
    }
  }
}

/**
 * Extracts a boolean attribute value from Attio's nested values structure.
 */
function extractAttributeValue(values: Record<string, unknown> | null, attrId: string): boolean {
  if (!values) return false;

  // Attio stores values in different formats, try common patterns
  const attrData = values[attrId];
  
  if (attrData === true || attrData === "true") return true;
  if (attrData === false || attrData === "false" || attrData === null || attrData === undefined) return false;

  // Attio often wraps values in an array of objects with active_from/active_until
  if (Array.isArray(attrData)) {
    for (const item of attrData) {
      const itemRec = asRecord(item);
      if (!itemRec) continue;
      // Checkbox type: look for value field
      if (itemRec.value === true || itemRec.value === "true") return true;
      // Sometimes it's a direct boolean at item level
      if (itemRec.checked === true || itemRec.checked === "true") return true;
    }
  }

  // Nested object with value field
  const attrRec = asRecord(attrData);
  if (attrRec) {
    if (attrRec.value === true || attrRec.value === "true") return true;
    if (attrRec.checked === true || attrRec.checked === "true") return true;
  }

  return false;
}

export async function runAttioSync(params: { actorUserId: string | null }): Promise<AttioSyncResult> {
  const startedAt = new Date();
  const [membersRaw, dealsRaw] = await Promise.all([listWorkspaceMembersRaw(), listDealsRaw()]);

  const memberUpserts = await Promise.all(
    membersRaw.map(async (raw) => {
      const rec = (asRecord(raw) ?? {}) as Record<string, unknown>;
      const id = extractWorkspaceMemberId(raw);
      if (!id) return null;
      const email =
        pickString(
          rec["email"],
          rec["email_address"],
          asRecord(rec["attributes"])?.["email"],
          asRecord(rec["user"])?.["email"],
        )?.toLowerCase() ?? null;
      const fullName =
        pickString(
          rec["name"],
          rec["full_name"],
          rec["fullName"],
          [pickString(rec["first_name"]), pickString(rec["last_name"])].filter(Boolean).join(" ").trim(),
        ) ?? null;
      const status = pickString(rec["access_level"], rec["status"]) ?? null;

      // Repair/migrate: if we previously stored a bad primary key (e.g. "[object Object]") for the same email,
      // we need to replace that row so future link-by-email yields a valid id.
      if (email) {
        const existingByEmail = await prisma.attioWorkspaceMember.findUnique({
          where: { email },
          select: { id: true },
        });
        if (existingByEmail && existingByEmail.id !== id) {
          return prisma.$transaction(async (tx) => {
            await tx.aEProfile.updateMany({
              where: { attioWorkspaceMemberId: existingByEmail.id },
              data: { attioWorkspaceMemberId: id },
            });

            // Safe because no FK references AttioWorkspaceMember directly.
            await tx.attioWorkspaceMember.delete({ where: { id: existingByEmail.id } });

            await tx.attioWorkspaceMember.create({
              data: { id, email, fullName, status, rawAttioPayload: raw as Prisma.InputJsonValue },
              select: { id: true },
            });
            return { id };
          });
        }
      }

      return prisma.attioWorkspaceMember.upsert({
        where: { id },
        update: { email, fullName, status, rawAttioPayload: raw as Prisma.InputJsonValue },
        create: { id, email, fullName, status, rawAttioPayload: raw as Prisma.InputJsonValue },
        select: { id: true },
      });
    }),
  );

  const parsedDeals = dealsRaw
    .map(parseDealRecord)
    .filter(Boolean)
    // Regardless of what we fetched from Attio, only persist wins.
    .filter((d) => (d!.status ?? "").toLowerCase().includes("won"));

  const dealUpserts = await Promise.all(
    parsedDeals.map((d) =>
      prisma.deal.upsert({
        where: { attioRecordId: d!.attioRecordId },
        update: {
          dealName: d!.dealName,
          accountName: d!.accountName ?? null,
          amount: d!.amount,
          commissionableAmount: d!.commissionableAmount,
          closeDate: new Date(d!.closeDate),
          status: d!.status,
          attioOwnerWorkspaceMemberId: d!.ownerWorkspaceMemberId ?? null,
          rawAttioPayload: d!.raw as Prisma.InputJsonValue,
        },
        create: {
          attioRecordId: d!.attioRecordId,
          dealName: d!.dealName,
          accountName: d!.accountName ?? null,
          amount: d!.amount,
          commissionableAmount: d!.commissionableAmount,
          closeDate: new Date(d!.closeDate),
          status: d!.status,
          attioOwnerWorkspaceMemberId: d!.ownerWorkspaceMemberId ?? null,
          rawAttioPayload: d!.raw as Prisma.InputJsonValue,
        },
        select: { id: true },
      }),
    ),
  );

  const result: AttioSyncResult = {
    membersFetched: membersRaw.length,
    dealsFetched: dealsRaw.length,
    dealsParsed: parsedDeals.length,
    membersUpserted: memberUpserts.filter(Boolean).length,
    dealsUpserted: dealUpserts.length,
    dealsAssigned: 0,
    aeProfilesLinked: 0,
    aeProfilesUpdated: 0,
    aeLinkConflicts: 0,
  };

  // Ensure AEProfiles are linked to Attio members by email, then assign deals accordingly.
  const linkRes = await reconcileUsersToAttioByEmail();
  result.aeProfilesLinked = linkRes.aeProfilesLinked;
  result.aeProfilesUpdated = linkRes.aeProfilesUpdated;
  result.aeLinkConflicts = linkRes.conflicts;

  // Optional cleanup: remove any previously-synced non-won deals so the DB stays lean.
  if ((process.env.ATTIO_PURGE_NON_WON ?? "false").toLowerCase() === "true") {
    await prisma.deal.deleteMany({
      where: { NOT: { status: { contains: "won", mode: "insensitive" } } },
    });
  }

  // Map synced deals to AEProfiles (based on AEProfile.attioWorkspaceMemberId).
  const reconcile = await reconcileDealsToAEs();
  result.dealsAssigned = reconcile.dealsUpdated;

  // Auto-apply bonus rules based on Attio attribute mappings
  await applyBonusRulesFromAttioAttributes(parsedDeals);

  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      action: "ATTIO_SYNC",
      entityType: "Attio",
      entityId: "workspace",
      detailsJson: ({
        ...result,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
      } satisfies Prisma.InputJsonValue),
    },
  });

  return result;
}

