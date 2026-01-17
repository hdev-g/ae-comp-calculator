import { listDealsRaw, listWorkspaceMembersRaw, parseDealRecord } from "@/server/attioClient";
import { reconcileDealsToAEs } from "@/server/aeDealAssignment";
import { prisma } from "@/server/db";

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
};

export async function runAttioSync(params: { actorUserId: string | null }): Promise<AttioSyncResult> {
  const startedAt = new Date();
  const [membersRaw, dealsRaw] = await Promise.all([listWorkspaceMembersRaw(), listDealsRaw()]);

  const memberUpserts = await Promise.all(
    membersRaw.map(async (raw) => {
      const rec = raw as Record<string, any>;
      const id = extractWorkspaceMemberId(raw);
      if (!id) return null;
      const email = pickString(rec?.email, rec?.attributes?.email, rec?.user?.email)?.toLowerCase() ?? null;
      const fullName = pickString(rec?.name, rec?.full_name, rec?.fullName) ?? null;
      const status = pickString(rec?.status) ?? null;

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
              data: { id, email, fullName, status, rawAttioPayload: raw as any },
              select: { id: true },
            });
            return { id };
          });
        }
      }

      return prisma.attioWorkspaceMember.upsert({
        where: { id },
        update: { email, fullName, status, rawAttioPayload: raw as any },
        create: { id, email, fullName, status, rawAttioPayload: raw as any },
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
          rawAttioPayload: d!.raw as any,
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
          rawAttioPayload: d!.raw as any,
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
  };

  // Optional cleanup: remove any previously-synced non-won deals so the DB stays lean.
  if ((process.env.ATTIO_PURGE_NON_WON ?? "false").toLowerCase() === "true") {
    await prisma.deal.deleteMany({
      where: { NOT: { status: { contains: "won", mode: "insensitive" } } },
    });
  }

  // Map synced deals to AEProfiles (based on AEProfile.attioWorkspaceMemberId).
  const reconcile = await reconcileDealsToAEs();
  result.dealsAssigned = reconcile.dealsUpdated;

  await prisma.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      action: "ATTIO_SYNC",
      entityType: "Attio",
      entityId: "workspace",
      detailsJson: {
        ...result,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
      } as any,
    },
  });

  return result;
}

