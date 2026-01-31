import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const plan = await prisma.commissionPlan.findUnique({
    where: { id },
    include: { 
      bonusRules: { orderBy: { name: "asc" } },
      performanceAccelerators: { orderBy: { minAttainment: "asc" } },
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const name = typeof data.name === "string" ? data.name.trim() : undefined;
  const effectiveStartDate = typeof data.effectiveStartDate === "string" ? data.effectiveStartDate : undefined;
  const effectiveEndDate = typeof data.effectiveEndDate === "string" ? data.effectiveEndDate : undefined;
  const baseCommissionRate = typeof data.baseCommissionRate === "number" ? data.baseCommissionRate : undefined;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (effectiveStartDate !== undefined) updateData.effectiveStartDate = new Date(effectiveStartDate);
  if (effectiveEndDate !== undefined) updateData.effectiveEndDate = effectiveEndDate ? new Date(effectiveEndDate) : null;
  if (baseCommissionRate !== undefined) updateData.baseCommissionRate = baseCommissionRate;

  // Handle bonus rules: delete existing and recreate
  const bonusRules = Array.isArray(data.bonusRules) ? data.bonusRules : null;
  const performanceAccelerators = Array.isArray(data.performanceAccelerators) ? data.performanceAccelerators : null;

  const plan = await prisma.$transaction(async (tx) => {
    if (bonusRules !== null) {
      await tx.bonusRule.deleteMany({ where: { commissionPlanId: id } });
      await tx.bonusRule.createMany({
        data: bonusRules
          .filter((r): r is Record<string, unknown> => r && typeof r === "object")
          .map((r) => ({
            commissionPlanId: id,
            name: typeof r.name === "string" ? r.name : "Untitled Bonus",
            rateAdd: typeof r.rateAdd === "number" ? r.rateAdd : 0,
            effectiveStartDate: typeof r.effectiveStartDate === "string" && r.effectiveStartDate 
              ? new Date(r.effectiveStartDate) 
              : null,
            effectiveEndDate: typeof r.effectiveEndDate === "string" && r.effectiveEndDate 
              ? new Date(r.effectiveEndDate) 
              : null,
            enabled: r.enabled !== false,
          })),
      });
    }

    if (performanceAccelerators !== null) {
      await tx.performanceAccelerator.deleteMany({ where: { commissionPlanId: id } });
      await tx.performanceAccelerator.createMany({
        data: performanceAccelerators
          .filter((a): a is Record<string, unknown> => a && typeof a === "object")
          .map((a) => ({
            commissionPlanId: id,
            minAttainment: typeof a.minAttainment === "number" ? a.minAttainment : 0,
            maxAttainment: typeof a.maxAttainment === "number" ? a.maxAttainment : null,
            commissionRate: typeof a.commissionRate === "number" ? a.commissionRate : 0,
          })),
      });
    }

    return tx.commissionPlan.update({
      where: { id },
      data: updateData,
      include: { 
        bonusRules: { orderBy: { name: "asc" } },
        performanceAccelerators: { orderBy: { minAttainment: "asc" } },
      },
    });
  });

  return NextResponse.json({ plan });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.commissionPlan.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
