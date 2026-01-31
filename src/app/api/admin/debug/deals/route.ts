import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

// Debug endpoint to see deal owner data - DELETE after debugging
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get deal owner stats
  const deals = await prisma.deal.findMany({
    select: {
      id: true,
      dealName: true,
      attioOwnerWorkspaceMemberId: true,
      aeProfileId: true,
    },
    take: 200,
  });

  // Get unique owner IDs from deals
  const ownerIds = [...new Set(deals.map((d) => d.attioOwnerWorkspaceMemberId).filter(Boolean))];

  // Check if Andrew's Attio ID appears in any deals
  const andrewAttioId = "332f95d2-df44-4f05-90bd-4dd8503b01bc";
  const andrewDeals = deals.filter((d) => d.attioOwnerWorkspaceMemberId === andrewAttioId);

  // Get AE profiles to map owner IDs
  const aeProfiles = await prisma.aEProfile.findMany({
    where: { attioWorkspaceMemberId: { not: null } },
    select: { id: true, attioWorkspaceMemberId: true, user: { select: { fullName: true } } },
  });

  // Check which owner IDs match AE profiles
  const ownerIdMatches = ownerIds.map((ownerId) => {
    const matchingAE = aeProfiles.find((ae) => ae.attioWorkspaceMemberId === ownerId);
    return {
      ownerId,
      matchesAE: matchingAE ? matchingAE.user.fullName : null,
      dealCount: deals.filter((d) => d.attioOwnerWorkspaceMemberId === ownerId).length,
    };
  });

  return NextResponse.json({
    totalDeals: deals.length,
    dealsWithOwner: deals.filter((d) => d.attioOwnerWorkspaceMemberId).length,
    dealsWithAEProfile: deals.filter((d) => d.aeProfileId).length,
    uniqueOwnerIds: ownerIds.length,
    andrewAttioId,
    andrewDealsCount: andrewDeals.length,
    andrewDeals: andrewDeals.slice(0, 5),
    ownerIdMatches,
    // Show a few deals to see what owner IDs look like
    sampleDeals: deals.slice(0, 10).map((d) => ({
      dealName: d.dealName,
      ownerId: d.attioOwnerWorkspaceMemberId,
      aeProfileId: d.aeProfileId,
    })),
  });
}
