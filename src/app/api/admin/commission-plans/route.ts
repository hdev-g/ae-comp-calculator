import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const plans = await prisma.commissionPlan.findMany({
    orderBy: { effectiveStartDate: "desc" },
    include: {
      bonusRules: {
        orderBy: { name: "asc" },
      },
    },
  });

  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as unknown;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const effectiveStartDate = typeof data.effectiveStartDate === "string" ? data.effectiveStartDate : "";
  const effectiveEndDate = typeof data.effectiveEndDate === "string" && data.effectiveEndDate ? data.effectiveEndDate : null;
  const baseCommissionRate = typeof data.baseCommissionRate === "number" ? data.baseCommissionRate : null;

  if (!name || !effectiveStartDate || baseCommissionRate === null) {
    return NextResponse.json(
      { error: "name, effectiveStartDate, and baseCommissionRate are required" },
      { status: 400 }
    );
  }

  const bonusRules = Array.isArray(data.bonusRules) ? data.bonusRules : [];

  const plan = await prisma.commissionPlan.create({
    data: {
      name,
      effectiveStartDate: new Date(effectiveStartDate),
      effectiveEndDate: effectiveEndDate ? new Date(effectiveEndDate) : null,
      baseCommissionRate,
      bonusRules: {
        create: bonusRules
          .filter((r): r is Record<string, unknown> => r && typeof r === "object")
          .map((r) => ({
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
      },
    },
    include: { bonusRules: true },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
