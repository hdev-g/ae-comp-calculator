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

  const map = new Map<string, string>();
  for (const m of mappings) {
    if (m.attioWorkspaceMemberId) map.set(m.attioWorkspaceMemberId, m.id);
  }

  let dealsUpdated = 0;

  for (const [memberId, aeProfileId] of map.entries()) {
    const res = await prisma.deal.updateMany({
      where: {
        attioOwnerWorkspaceMemberId: memberId,
        NOT: { aeProfileId },
      },
      data: { aeProfileId },
    });
    dealsUpdated += res.count;
  }

  return { memberIdsMapped: map.size, dealsUpdated };
}

