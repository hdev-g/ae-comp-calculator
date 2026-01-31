import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await req.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    const bonusRuleId = typeof data.bonusRuleId === "string" ? data.bonusRuleId : null;
    const enabled = typeof data.enabled === "boolean" ? data.enabled : null;

    if (!bonusRuleId || enabled === null) {
      return NextResponse.json({ error: "bonusRuleId and enabled are required" }, { status: 400 });
    }

    // Get the current deal
    const deal = await prisma.deal.findUnique({
      where: { id },
      select: { appliedBonusRuleIds: true, aeProfileId: true },
    });

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Verify user has access (is the AE or is an admin)
    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin) {
      const userAE = await prisma.aEProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (userAE?.id !== deal.aeProfileId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Update the applied bonus rules
    const currentRuleIds = Array.isArray(deal.appliedBonusRuleIds) 
      ? (deal.appliedBonusRuleIds as string[])
      : [];
    
    let newRuleIds: string[];
    if (enabled) {
      // Add the rule if not already present
      newRuleIds = currentRuleIds.includes(bonusRuleId) 
        ? currentRuleIds 
        : [...currentRuleIds, bonusRuleId];
    } else {
      // Remove the rule
      newRuleIds = currentRuleIds.filter((id) => id !== bonusRuleId);
    }

    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: { appliedBonusRuleIds: newRuleIds },
      select: { id: true, appliedBonusRuleIds: true },
    });

    return NextResponse.json({ deal: updatedDeal });
  } catch (error) {
    console.error("[deals/bonus-rules] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
