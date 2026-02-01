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
  const [aes, members] = await Promise.all([
    prisma.aEProfile.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, user: { select: { email: true } }, attioWorkspaceMemberId: true },
    }),
    prisma.attioWorkspaceMember.findMany({
      where: { email: { not: null } },
      select: { id: true, email: true },
    }),
  ]);

  const memberByEmail = new Map(
    members
      .filter((m) => m.email)
      .map((m) => [m.email!.toLowerCase().trim(), m.id])
  );

  let aeProfilesLinked = 0;
  let aeProfilesUpdated = 0;
  let conflicts = 0;

  for (const ae of aes) {
    const email = (ae.user.email ?? "").toLowerCase().trim();
    if (!email) continue;

    const memberId = memberByEmail.get(email);
    if (!memberId) continue;

    if (!ae.attioWorkspaceMemberId) {
      try {
        await prisma.aEProfile.update({
          where: { id: ae.id },
          data: { attioWorkspaceMemberId: memberId },
          select: { id: true },
        });
        aeProfilesLinked += 1;
      } catch {
        conflicts += 1;
      }
      continue;
    }

    if (ae.attioWorkspaceMemberId !== memberId) {
      try {
        await prisma.aEProfile.update({
          where: { id: ae.id },
          data: { attioWorkspaceMemberId: memberId },
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

