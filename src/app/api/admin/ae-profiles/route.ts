import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  return NextResponse.json({ profiles, commissionPlans });
}
