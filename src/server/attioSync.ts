import { listDealsRaw, listWorkspaceMembersRaw, parseDealRecord } from "@/server/attioClient";
import { reconcileDealsToAEs } from "@/server/aeDealAssignment";
import { prisma } from "@/server/db";

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
      const id = (rec?.id ?? rec?.workspace_member_id ?? rec?.workspaceMemberId ?? "").toString();
      if (!id) return null;
      const email = (rec?.email ?? rec?.attributes?.email ?? rec?.user?.email ?? null)?.toString() ?? null;
      const fullName = (rec?.name ?? rec?.full_name ?? rec?.fullName ?? null)?.toString() ?? null;
      const status = (rec?.status ?? null)?.toString() ?? null;

      return prisma.attioWorkspaceMember.upsert({
        where: { id },
        update: { email, fullName, status, rawAttioPayload: raw as any },
        create: { id, email, fullName, status, rawAttioPayload: raw as any },
        select: { id: true },
      });
    }),
  );

  const parsedDeals = dealsRaw.map(parseDealRecord).filter(Boolean);

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

