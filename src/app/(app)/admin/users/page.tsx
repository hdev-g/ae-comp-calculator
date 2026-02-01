import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { UserProfileManager } from "@/components/UserProfileManager";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const [profiles, commissionPlans] = await Promise.all([
    prisma.aEProfile.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, profileImageUrl: true, role: true },
        },
        commissionPlan: {
          select: { id: true, name: true },
        },
      },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.commissionPlan.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const serializedProfiles = profiles.map((profile) => ({
    ...profile,
    annualTarget: profile.annualTarget ? Number(profile.annualTarget) : null,
    startDate: profile.startDate ? profile.startDate.toISOString() : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage user profiles, segments, territories, and commission plans.
        </p>
      </div>
      <UserProfileManager
        initialProfiles={serializedProfiles}
        initialCommissionPlans={commissionPlans}
      />
    </div>
  );
}
