import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

// Debug endpoint to see Attio member data - DELETE after debugging
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get all Attio workspace members
  const attioMembers = await prisma.attioWorkspaceMember.findMany({
    select: { id: true, email: true, fullName: true },
    orderBy: { email: "asc" },
  });

  // Get all AE profiles with their user emails
  const aeProfiles = await prisma.aEProfile.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      attioWorkspaceMemberId: true,
      user: { select: { email: true, fullName: true } },
    },
    orderBy: { user: { email: "asc" } },
  });

  // Find potential matches
  const matches = aeProfiles.map((ae) => {
    const userEmail = ae.user.email.toLowerCase();
    const matchingMember = attioMembers.find(
      (m) => m.email?.toLowerCase() === userEmail
    );
    return {
      aeProfileId: ae.id,
      userEmail: ae.user.email,
      userName: ae.user.fullName,
      currentAttioMemberId: ae.attioWorkspaceMemberId,
      matchingAttioMember: matchingMember ?? null,
      isLinked: !!ae.attioWorkspaceMemberId,
      wouldMatch: !!matchingMember,
    };
  });

  return NextResponse.json({
    attioMembersCount: attioMembers.length,
    attioMembersWithEmail: attioMembers.filter((m) => m.email).length,
    aeProfilesCount: aeProfiles.length,
    attioMembers: attioMembers.slice(0, 20), // First 20 for debugging
    matches,
  });
}
