import { prisma } from "@/server/db";

export type ReconcileResult = {
  memberIdsMapped: number;
  dealsUpdated: number;
};

/**
 * Assign deals to AEProfiles based on Attio owner mapping:
 * Deal.attioOwnerWorkspaceMemberId -> AEProfile.attioWorkspaceMemberId.
 *
 * This is idempotent and safe to run repeatedly.
 */
export async function reconcileDealsToAEs(params?: { onlyMemberId?: string }): Promise<ReconcileResult> {
  const mappings = await prisma.aEProfile.findMany({
    where: {
      status: "ACTIVE",
      attioWorkspaceMemberId: params?.onlyMemberId ? params.onlyMemberId : { not: null },
    },
    select: { id: true, attioWorkspaceMemberId: true },
  });

  const memberIdsByAE = new Map<string, string[]>();
  for (const m of mappings) {
    if (!m.attioWorkspaceMemberId) continue;
    const list = memberIdsByAE.get(m.id) ?? [];
    list.push(m.attioWorkspaceMemberId);
    memberIdsByAE.set(m.id, list);
  }

  let dealsUpdated = 0;

  for (const [aeProfileId, memberIds] of memberIdsByAE.entries()) {
    // Update all deals where owner matches any memberIds but aeProfileId is different or null
    const res = await prisma.deal.updateMany({
      where: {
        attioOwnerWorkspaceMemberId: { in: memberIds },
        OR: [
          { aeProfileId: null },
          { aeProfileId: { not: aeProfileId } },
        ],
      },
      data: { aeProfileId },
    });
    dealsUpdated += res.count;
  }

  return { memberIdsMapped: mappings.length, dealsUpdated };
}

