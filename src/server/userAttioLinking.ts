import { prisma } from "@/server/db";

export type UserAttioReconcileResult = {
  aeProfilesLinked: number;
  aeProfilesUpdated: number;
  conflicts: number;
};

/**
 * Ensures each AEProfile is linked to the correct Attio workspace member id based on email:
 * User.email (lowercased from Google SSO) -> AttioWorkspaceMember.email (stored lowercased during sync).
 *
 * If a profile is already linked but points at the wrong member, we update it.
 * If linking would violate the unique constraint (same Attio member already linked to another AEProfile),
 * we skip and count a conflict (admin can resolve later).
 */
export async function reconcileUsersToAttioByEmail(): Promise<UserAttioReconcileResult> {
  const aes = await prisma.aEProfile.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, user: { select: { email: true } }, attioWorkspaceMemberId: true },
  });

  let aeProfilesLinked = 0;
  let aeProfilesUpdated = 0;
  let conflicts = 0;

  for (const ae of aes) {
    const email = (ae.user.email ?? "").toLowerCase().trim();
    if (!email) continue;

    const member = await prisma.attioWorkspaceMember.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!member?.id) continue;

    if (!ae.attioWorkspaceMemberId) {
      try {
        await prisma.aEProfile.update({
          where: { id: ae.id },
          data: { attioWorkspaceMemberId: member.id },
          select: { id: true },
        });
        aeProfilesLinked += 1;
      } catch {
        conflicts += 1;
      }
      continue;
    }

    if (ae.attioWorkspaceMemberId !== member.id) {
      try {
        await prisma.aEProfile.update({
          where: { id: ae.id },
          data: { attioWorkspaceMemberId: member.id },
          select: { id: true },
        });
        aeProfilesUpdated += 1;
      } catch {
        conflicts += 1;
      }
    }
  }

  return { aeProfilesLinked, aeProfilesUpdated, conflicts };
}

