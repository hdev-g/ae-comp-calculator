import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { CommissionPlanManager } from "@/components/CommissionPlanManager";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export default async function AdminCommissionPlansPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const plans = await prisma.commissionPlan.findMany({
    orderBy: { effectiveStartDate: "desc" },
    include: {
      bonusRules: {
        orderBy: { name: "asc" },
      },
      performanceAccelerators: {
        orderBy: { minAttainment: "asc" },
      },
    },
  });
  const serializedPlans = plans.map((plan) => ({
    ...plan,
    baseCommissionRate: Number(plan.baseCommissionRate),
    effectiveStartDate: plan.effectiveStartDate.toISOString(),
    effectiveEndDate: plan.effectiveEndDate ? plan.effectiveEndDate.toISOString() : null,
    bonusRules: plan.bonusRules.map((rule) => ({
      ...rule,
      effectiveStartDate: rule.effectiveStartDate ? rule.effectiveStartDate.toISOString() : null,
      effectiveEndDate: rule.effectiveEndDate ? rule.effectiveEndDate.toISOString() : null,
      rateAdd: Number(rule.rateAdd),
    })),
    performanceAccelerators: plan.performanceAccelerators.map((acc) => ({
      ...acc,
      minAttainment: Number(acc.minAttainment),
      maxAttainment: acc.maxAttainment !== null ? Number(acc.maxAttainment) : null,
      commissionRate: Number(acc.commissionRate),
    })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Commission Plans</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create and manage commission plans with base rates and bonus rules.
        </p>
      </div>
      <CommissionPlanManager initialPlans={serializedPlans} />
    </div>
  );
}
