import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await req.json().catch(() => null)) as unknown;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const data = body as Record<string, unknown>;
    
    // Build update data for AEProfile
    const profileUpdateData: { 
      jobRole?: string | null;
      segment?: string | null; 
      territory?: string | null;
      commissionPlanId?: string | null;
      annualTarget?: number | null;
      startDate?: Date | null;
      payoutCurrency?: string | null;
    } = {};

    // Build update data for User (for admin role)
    const userUpdateData: {
      role?: "AE" | "ADMIN";
    } = {};

    if ("jobRole" in data) {
      profileUpdateData.jobRole = typeof data.jobRole === "string" && data.jobRole.trim() 
        ? data.jobRole.trim() 
        : null;
    }
    
    if ("segment" in data) {
      profileUpdateData.segment = typeof data.segment === "string" && data.segment.trim() 
        ? data.segment.trim() 
        : null;
    }
    
    if ("territory" in data) {
      profileUpdateData.territory = typeof data.territory === "string" && data.territory.trim() 
        ? data.territory.trim() 
        : null;
    }

    if ("commissionPlanId" in data) {
      profileUpdateData.commissionPlanId = typeof data.commissionPlanId === "string" && data.commissionPlanId.trim() 
        ? data.commissionPlanId.trim() 
        : null;
    }

    if ("annualTarget" in data) {
      profileUpdateData.annualTarget = typeof data.annualTarget === "number" && data.annualTarget > 0
        ? data.annualTarget
        : null;
    }

    if ("startDate" in data) {
      profileUpdateData.startDate = typeof data.startDate === "string" && data.startDate.trim()
        ? new Date(data.startDate)
        : null;
    }

    if ("payoutCurrency" in data) {
      profileUpdateData.payoutCurrency =
        typeof data.payoutCurrency === "string" && data.payoutCurrency.trim()
          ? data.payoutCurrency.trim().toUpperCase()
          : null;
    }

    // Handle isAdmin toggle - updates User.role
    if ("isAdmin" in data) {
      userUpdateData.role = data.isAdmin === true ? "ADMIN" : "AE";
    }

    const hasProfileUpdate = Object.keys(profileUpdateData).length > 0;
    const hasUserUpdate = Object.keys(userUpdateData).length > 0;

    if (!hasProfileUpdate && !hasUserUpdate) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Get the profile to find the associated userId
    const existingProfile = await prisma.aEProfile.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Perform updates in a transaction (user update first, then profile)
    const profileUpdateOp = prisma.aEProfile.update({
      where: { id },
      data: hasProfileUpdate ? profileUpdateData : {},
      include: {
        user: {
          select: { id: true, fullName: true, email: true, profileImageUrl: true, role: true },
        },
        commissionPlan: {
          select: { id: true, name: true },
        },
      },
    });

    let profile;
    if (hasUserUpdate) {
      const [, updatedProfile] = await prisma.$transaction([
        prisma.user.update({
          where: { id: existingProfile.userId },
          data: userUpdateData,
        }),
        profileUpdateOp,
      ]);
      profile = updatedProfile;
    } else {
      profile = await profileUpdateOp;
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("[ae-profiles/PUT] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
