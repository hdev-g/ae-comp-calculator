import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AdminReportingTable } from "@/components/AdminReportingTable";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";
import { calculateEffectiveTarget } from "@/server/targets";

type ReportingView = "ytd" | "qtd" | "prevq";

function isReportingView(value: string | undefined): value is ReportingView {
  return value === "ytd" || value === "qtd" || value === "prevq";
}

function getQuarterForDate(date: Date): { year: number; quarter: number } {
  const month = date.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return { year: date.getFullYear(), quarter };
}

function getQuarterDateRangeUTC(year: number, quarter: number): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59));
  return { start, end };
}

function getPreviousQuarter(year: number, quarter: number): { year: number; quarter: number } {
  if (quarter === 1) return { year: year - 1, quarter: 4 };
  return { year, quarter: quarter - 1 };
}

function decimalToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  try {
    return Number(value);
  } catch {
    return 0;
  }
}

function formatCurrency(amount: number, currency = "USD") {
  return Math.ceil(amount).toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default async function AdminReportingPage(props: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const sp = (await props.searchParams) ?? {};
  const view: ReportingView = isReportingView(sp.view) ? sp.view : "ytd";
  const now = new Date();
  const { year, quarter } = getQuarterForDate(now);
  const ytdStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const { start: qtdStart, end: qtdEnd } = getQuarterDateRangeUTC(year, quarter);
  const prev = getPreviousQuarter(year, quarter);
  const { start: prevStart, end: prevEnd } = getQuarterDateRangeUTC(prev.year, prev.quarter);

  const range =
    view === "ytd"
      ? { start: ytdStart, end: now }
      : view === "prevq"
        ? { start: prevStart, end: prevEnd }
        : { start: qtdStart, end: qtdEnd };

  const profiles = await prisma.aEProfile.findMany({
    where: { status: "ACTIVE" },
    include: {
      user: {
        select: { fullName: true, email: true },
      },
      commissionPlan: {
        select: {
          name: true,
          baseCommissionRate: true,
          bonusRules: {
            where: { enabled: true },
            select: { id: true, rateAdd: true },
          },
          performanceAccelerators: {
            select: { minAttainment: true, maxAttainment: true, commissionRate: true },
            orderBy: { minAttainment: "asc" },
          },
        },
      },
    },
    orderBy: { user: { fullName: "asc" } },
  });

  const profileIds = profiles.map((p) => p.id);
  const deals = profileIds.length
    ? await prisma.deal.findMany({
        where: {
          aeProfileId: { in: profileIds },
          status: { contains: "won", mode: "insensitive" },
          closeDate: { gte: range.start, lte: range.end },
        },
        select: {
          aeProfileId: true,
          amount: true,
          appliedBonusRuleIds: true,
        },
      })
    : [];

  const ytdTotals = profileIds.length
    ? await prisma.deal.groupBy({
        by: ["aeProfileId"],
        where: {
          aeProfileId: { in: profileIds },
          status: { contains: "won", mode: "insensitive" },
          closeDate: { gte: ytdStart, lte: now },
        },
        _sum: { amount: true },
      })
    : [];
  const ytdTotalsByAe = new Map(
    ytdTotals.map((row) => [row.aeProfileId, decimalToNumber(row._sum.amount)])
  );

  const dealsByAe = new Map<string, typeof deals>();
  for (const deal of deals) {
    const list = dealsByAe.get(deal.aeProfileId ?? "") ?? [];
    list.push(deal);
    dealsByAe.set(deal.aeProfileId ?? "", list);
  }

  const fxRates = await prisma.fxRate.findMany({
    where: { year },
    select: { currencyCode: true, rate: true },
  });
  const fxByCurrency = new Map(
    fxRates.map((r) => [r.currencyCode.toUpperCase(), decimalToNumber(r.rate)])
  );

  const rows = profiles.map((profile) => {
    const plan = profile.commissionPlan;
    const baseRate = plan?.baseCommissionRate ? decimalToNumber(plan.baseCommissionRate) : 0;
    const bonusRules = plan?.bonusRules ?? [];
    const bonusMap = new Map(bonusRules.map((r) => [r.id, decimalToNumber(r.rateAdd)]));

    const aeDeals = dealsByAe.get(profile.id) ?? [];
    let dealCommission = 0;
    let totalAmount = 0;
    let totalWins = 0;

    for (const deal of aeDeals) {
      const amount = decimalToNumber(deal.amount);
      totalAmount += amount;
      const applied = Array.isArray(deal.appliedBonusRuleIds)
        ? (deal.appliedBonusRuleIds as string[])
        : [];
      const bonusRate = applied.reduce((sum, id) => sum + (bonusMap.get(id) ?? 0), 0);
      dealCommission += amount * (baseRate + bonusRate);
    }

    const adjustedTargetInfo = calculateEffectiveTarget({
      annualTarget: decimalToNumber(profile.annualTarget),
      startDate: profile.startDate,
      view: "ytd",
      currentYear: year,
      currentQuarter: quarter,
    });
    const adjustedAnnualTarget = adjustedTargetInfo.adjustedAnnualTarget;
    const ytdAmount = ytdTotalsByAe.get(profile.id) ?? 0;
    const quotaAttainment =
      adjustedAnnualTarget > 0 ? (ytdAmount / adjustedAnnualTarget) * 100 : 0;

    let currentTier:
      | { minAttainment: number; maxAttainment: number | null; commissionRate: number }
      | null = null;
    const tiers = plan?.performanceAccelerators ?? [];
    if (tiers.length > 0) {
      for (const tier of tiers) {
        const minAttainment = decimalToNumber(tier.minAttainment);
        const maxAttainment =
          tier.maxAttainment !== null ? decimalToNumber(tier.maxAttainment) : null;
        const meetsMin = quotaAttainment >= minAttainment;
        const meetsMax = maxAttainment === null || quotaAttainment <= maxAttainment;
        if (meetsMin && meetsMax) {
          currentTier = {
            minAttainment,
            maxAttainment,
            commissionRate: decimalToNumber(tier.commissionRate),
          };
        }
      }
      if (!currentTier) {
        const first = tiers[0];
        currentTier = {
          minAttainment: decimalToNumber(first.minAttainment),
          maxAttainment: first.maxAttainment !== null ? decimalToNumber(first.maxAttainment) : null,
          commissionRate: decimalToNumber(first.commissionRate),
        };
      }
    }

    const amountOverTarget = Math.max(0, ytdAmount - adjustedAnnualTarget);
    let annualAcceleratorBonus = 0;
    if (quotaAttainment >= 100 && amountOverTarget > 0 && currentTier && adjustedAnnualTarget > 0) {
      const acceleratorRate = currentTier.commissionRate - baseRate;
      if (acceleratorRate > 0) {
        annualAcceleratorBonus = amountOverTarget * acceleratorRate;
      }
    }

    const totalCommissionUsd = dealCommission + annualAcceleratorBonus;
    const payoutCurrency = (profile.payoutCurrency ?? "USD").toUpperCase();
    const fxRate = payoutCurrency === "USD" ? 1 : fxByCurrency.get(payoutCurrency) ?? 1;
    const totalCommissionLocal = totalCommissionUsd * fxRate;
    const averagePercent =
      totalAmount > 0 ? (totalCommissionUsd / totalAmount) * 100 : 0;

    return {
      id: profile.id,
      name: profile.user.fullName ?? profile.user.email ?? "Unknown",
      jobRole: profile.jobRole ?? "—",
      commissionPlanName: plan?.name ?? null,
      segment: profile.segment ?? "—",
      territory: profile.territory ?? "—",
      annualTarget: adjustedAnnualTarget,
      totalWins: totalAmount,
      averagePercent,
      dealCommission,
      annualAcceleratorBonus,
      totalCommissionUsd,
      totalCommissionLocal,
      payoutCurrency,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reporting</h1>
        <p className="mt-1 text-sm text-zinc-500">
          YTD commission reporting by user. Annual target reflects ramp adjustments.
        </p>
      </div>

      <AdminReportingTable rows={rows} view={view} />
    </div>
  );
}
