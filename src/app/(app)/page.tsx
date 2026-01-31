import { getServerSession } from "next-auth";

import { AESelector } from "@/components/AESelector";
import { DealsTable } from "@/components/DealsTable";

// Force dynamic rendering to ensure page updates on navigation
export const dynamic = "force-dynamic";
import {
  getPreviousQuarter,
  getQuarterDateRangeUTC,
  getQuarterForDate,
} from "@/lib/quarters";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

type DashboardView = "ytd" | "qtd" | "prevq";

function isDashboardView(v: unknown): v is DashboardView {
  return v === "ytd" || v === "qtd" || v === "prevq";
}

type DecimalLike = { toNumber: () => number };

function isDecimalLike(v: unknown): v is DecimalLike {
  return Boolean(v && typeof v === "object" && "toNumber" in v && typeof (v as DecimalLike).toNumber === "function");
}

function decimalToNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  if (isDecimalLike(v)) {
    const n = v.toNumber();
    return typeof n === "number" && Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
  }
  return name.slice(0, 2).toUpperCase();
}

function getTerritoryColors(territory: string): string {
  const t = territory.toLowerCase();
  if (t.includes("north america") || t === "na") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (t === "emea" || t.includes("europe")) {
    return "bg-violet-50 text-violet-700";
  }
  if (t === "apac" || t.includes("asia") || t.includes("pacific")) {
    return "bg-amber-50 text-amber-700";
  }
  if (t === "latam" || t.includes("latin")) {
    return "bg-rose-50 text-rose-700";
  }
  // Default fallback
  return "bg-zinc-100 text-zinc-700";
}

/**
 * Calculate effective target based on view, annual target, and start date.
 * - First quarter after start date = 50% of normal quarterly target
 * - Full year target is adjusted if started mid-year
 * - adjustedAnnualTarget shows what the user's actual annual target is accounting for ramp
 */
function calculateEffectiveTarget(params: {
  annualTarget: number;
  startDate: Date | null;
  view: DashboardView;
  currentYear: number;
  currentQuarter: number;
}): { target: number; adjustedAnnualTarget: number; isRampQuarter: boolean; label: string } {
  const { annualTarget, startDate, view, currentYear, currentQuarter } = params;
  
  if (annualTarget <= 0) {
    return { target: 0, adjustedAnnualTarget: 0, isRampQuarter: false, label: "No target set" };
  }
  
  const quarterlyTarget = annualTarget / 4;
  
  // Determine which quarter they started in (if this year)
  let startQuarter: number | null = null;
  let startedThisYear = false;
  
  if (startDate) {
    const startYear = startDate.getFullYear();
    if (startYear === currentYear) {
      startedThisYear = true;
      const startMonth = startDate.getMonth();
      startQuarter = Math.floor(startMonth / 3) + 1; // 1-4
    }
  }
  
  // Calculate adjusted annual target (accounts for ramp and quarters not employed)
  // E.g., $1M target, starts Q1: 3 full quarters + 1 ramp = $875k
  // E.g., $1M target, starts Q2: 2 full quarters + 1 ramp = $625k
  // E.g., $1M target, starts Q3: 1 full quarter + 1 ramp = $375k
  // E.g., $1M target, starts Q4: 0 full quarters + 1 ramp = $125k
  let adjustedAnnualTarget = annualTarget;
  if (startedThisYear && startQuarter !== null) {
    const fullQuartersRemaining = 4 - startQuarter; // Quarters after the start quarter
    const rampQuarterTarget = quarterlyTarget * 0.5;
    adjustedAnnualTarget = rampQuarterTarget + (fullQuartersRemaining * quarterlyTarget);
  }
  
  if (view === "qtd") {
    // Current quarter target
    const isRampQuarter = startedThisYear && startQuarter === currentQuarter;
    const target = isRampQuarter ? quarterlyTarget * 0.5 : quarterlyTarget;
    return { 
      target, 
      adjustedAnnualTarget,
      isRampQuarter, 
      label: isRampQuarter ? `Q${currentQuarter} Target (Ramp)` : `Q${currentQuarter} Target`
    };
  }
  
  if (view === "ytd") {
    // Sum of all quarters from start quarter to current quarter
    let ytdTarget = 0;
    const effectiveStartQ = startedThisYear && startQuarter ? startQuarter : 1;
    for (let q = effectiveStartQ; q <= currentQuarter; q++) {
      const isRampQ = startedThisYear && startQuarter === q;
      ytdTarget += isRampQ ? quarterlyTarget * 0.5 : quarterlyTarget;
    }
    const hasRamp = startedThisYear && startQuarter !== null && startQuarter <= currentQuarter;
    return { 
      target: ytdTarget, 
      adjustedAnnualTarget,
      isRampQuarter: hasRamp, 
      label: hasRamp ? "YTD Target (incl. ramp)" : "YTD Target"
    };
  }
  
  if (view === "prevq") {
    // Previous quarter target
    const prevQ = currentQuarter === 1 ? 4 : currentQuarter - 1;
    const prevYear = currentQuarter === 1 ? currentYear - 1 : currentYear;
    const isRampQuarter = startDate && 
      startDate.getFullYear() === prevYear && 
      Math.floor(startDate.getMonth() / 3) + 1 === prevQ;
    const target = isRampQuarter ? quarterlyTarget * 0.5 : quarterlyTarget;
    return { 
      target, 
      adjustedAnnualTarget,
      isRampQuarter: !!isRampQuarter, 
      label: isRampQuarter ? `Q${prevQ} Target (Ramp)` : `Q${prevQ} Target`
    };
  }
  
  return { target: annualTarget, adjustedAnnualTarget, isRampQuarter: false, label: "Annual Target" };
}

export default async function DashboardPage(props: {
  searchParams?: Promise<{ view?: string; ae?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const isAdmin = session?.user?.role === "ADMIN";
  if (!userId) return null;

  const sp = (await props.searchParams) ?? {};
  const view: DashboardView = isDashboardView(sp.view) ? sp.view : "qtd";
  const selectedAEId = typeof sp.ae === "string" && sp.ae ? sp.ae : null;
  const now = new Date();
  const { year, quarter } = getQuarterForDate(now);

  const { start: qtdStart, end: qtdEnd } = getQuarterDateRangeUTC(year, quarter);
  const prev = getPreviousQuarter(year, quarter);
  const { start: prevStart, end: prevEnd } = getQuarterDateRangeUTC(prev.year, prev.quarter);
  const ytdStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0));

  const range =
    view === "ytd"
      ? { start: ytdStart, end: now }
      : view === "prevq"
        ? { start: prevStart, end: prevEnd }
        : { start: qtdStart, end: qtdEnd };

  // Fetch all AEs if admin (for the selector)
  const allAEs = isAdmin
    ? await prisma.aEProfile.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          segment: true,
          territory: true,
          annualTarget: true,
          startDate: true,
          user: { select: { fullName: true, email: true, profileImageUrl: true } },
          commissionPlan: { 
            select: { 
              id: true, 
              name: true, 
              baseCommissionRate: true,
              bonusRules: {
                where: { enabled: true },
                select: { id: true, name: true, rateAdd: true },
                orderBy: { name: "asc" },
              },
            } 
          },
        },
        orderBy: { user: { fullName: "asc" } },
      })
    : [];

  const aeOptions = allAEs.map((ae) => ({
    id: ae.id,
    name: ae.user.fullName ?? "",
    email: ae.user.email,
  }));

  // Determine which AE profile to use
  let targetAEProfile: {
    id: string;
    segment: string | null;
    territory: string | null;
    annualTarget: unknown;
    startDate: Date | null;
    user: { fullName: string | null; email: string; profileImageUrl: string | null };
    commissionPlan: { 
      id: string; 
      name: string; 
      baseCommissionRate: unknown;
      bonusRules: { id: string; name: string; rateAdd: unknown }[];
    } | null;
  } | null = null;

  if (isAdmin && selectedAEId) {
    // Admin is impersonating another AE
    const selectedAE = allAEs.find((ae) => ae.id === selectedAEId);
    if (selectedAE) {
      targetAEProfile = selectedAE;
    }
  }
  
  if (!targetAEProfile) {
    // Use the logged-in user's AE profile
    const myAE = await prisma.aEProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        segment: true,
        territory: true,
        annualTarget: true,
        startDate: true,
        user: { select: { fullName: true, email: true, profileImageUrl: true } },
        commissionPlan: { 
          select: { 
            id: true, 
            name: true, 
            baseCommissionRate: true,
            bonusRules: {
              where: { enabled: true },
              select: { id: true, name: true, rateAdd: true },
              orderBy: { name: "asc" },
            },
          } 
        },
      },
    });
    if (myAE) {
      targetAEProfile = myAE;
    }
  }

  const targetAEProfileId = targetAEProfile?.id ?? null;

  const dealsFromDb = targetAEProfileId
    ? await prisma.deal.findMany({
        where: {
          aeProfileId: targetAEProfileId,
          status: { contains: "won", mode: "insensitive" },
          closeDate: { gte: range.start, lte: range.end },
        },
        orderBy: [{ closeDate: "desc" }],
        take: 500,
      })
    : [];

  // Transform deals for the table
  const dealsForTable = dealsFromDb.map((d) => ({
    id: d.id,
    dealName: d.dealName,
    accountName: d.accountName,
    amount: decimalToNumber(d.amount),
    closeDate: d.closeDate.toISOString(),
    appliedBonusRuleIds: Array.isArray(d.appliedBonusRuleIds) 
      ? (d.appliedBonusRuleIds as string[])
      : [],
  }));

  // Get bonus rules for the AE's commission plan
  const bonusRules = targetAEProfile?.commissionPlan?.bonusRules.map((r) => ({
    id: r.id,
    name: r.name,
    rateAdd: decimalToNumber(r.rateAdd),
  })) ?? [];

  const baseRate = targetAEProfile?.commissionPlan?.baseCommissionRate 
    ? decimalToNumber(targetAEProfile.commissionPlan.baseCommissionRate) 
    : 0;

  // Calculate totals
  const totalAmount = dealsForTable.reduce((sum, d) => sum + d.amount, 0);
  const totalCommission = dealsForTable.reduce((sum, d) => {
    let rate = baseRate;
    for (const rule of bonusRules) {
      if (d.appliedBonusRuleIds.includes(rule.id)) {
        rate += rule.rateAdd;
      }
    }
    return sum + (d.amount * rate);
  }, 0);

  // AE display info
  const aeName = targetAEProfile?.user.fullName ?? targetAEProfile?.user.email ?? "Unknown";
  const aeProfileImageUrl = targetAEProfile?.user.profileImageUrl ?? null;
  const aeSegment = targetAEProfile?.segment ?? null;
  const aeTerritory = targetAEProfile?.territory ?? null;
  const aeCommissionPlan = targetAEProfile?.commissionPlan ?? null;
  const aeAnnualTarget = decimalToNumber(targetAEProfile?.annualTarget);
  const aeStartDate = targetAEProfile?.startDate ?? null;

  // Calculate effective target based on view and ramp period
  const targetInfo = calculateEffectiveTarget({
    annualTarget: aeAnnualTarget,
    startDate: aeStartDate,
    view,
    currentYear: year,
    currentQuarter: quarter,
  });

  // Calculate variance
  const variance = totalAmount - targetInfo.target;
  const variancePercent = targetInfo.target > 0 ? (variance / targetInfo.target) * 100 : 0;
  const isAheadOfTarget = variance >= 0;

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* Left: Avatar + AE Info */}
            <div className="flex items-start gap-6">
              {/* Avatar + Name/Segment/Territory */}
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative size-16 flex-shrink-0">
                  {aeProfileImageUrl ? (
                    <img
                      src={aeProfileImageUrl}
                      alt={aeName}
                      className="size-16 rounded-full object-cover ring-2 ring-zinc-100"
                    />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-full bg-zinc-200 text-xl font-semibold text-zinc-600 ring-2 ring-zinc-100">
                      {getInitials(aeName)}
                    </div>
                  )}
                </div>

                {/* Name, Segment, Territory */}
                <div className="flex flex-col">
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{aeName}</h1>
                  {aeSegment ? (
                    <span className="mt-1 inline-flex w-fit items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {aeSegment}
                    </span>
                  ) : (
                    <span className="mt-1 text-sm text-zinc-400">No segment set</span>
                  )}
                  {aeTerritory ? (
                    <span className={`mt-1 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTerritoryColors(aeTerritory)}`}>
                      {aeTerritory}
                    </span>
                  ) : (
                    <span className="mt-1 text-sm text-zinc-400">No territory set</span>
                  )}
                </div>
              </div>

              {/* Commission Plan Card */}
              <div className="hidden sm:block rounded-xl border border-zinc-200 bg-white px-5 py-3">
                <div className="text-xs text-zinc-500">Commission Plan</div>
                {aeCommissionPlan ? (
                  <>
                    <div className="mt-1 font-medium text-zinc-900">{aeCommissionPlan.name}</div>
                    <div className="mt-0.5 text-sm text-zinc-500">
                      Base rate: {formatPercent(baseRate)}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm text-zinc-400">No plan assigned</div>
                )}
              </div>

              {/* Target Card */}
              <div className="hidden sm:block rounded-xl border border-zinc-200 bg-white px-5 py-3">
                <div className="text-xs text-zinc-500">{targetInfo.label}</div>
                {aeAnnualTarget > 0 ? (
                  <>
                    <div className="mt-1 font-medium text-zinc-900">{formatCurrency(targetInfo.target)}</div>
                    <div className="mt-0.5 text-sm text-zinc-500">
                      Annual: {formatCurrency(targetInfo.adjustedAnnualTarget)}
                      {targetInfo.adjustedAnnualTarget < aeAnnualTarget && (
                        <span className="text-zinc-400"> (ramp)</span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm text-zinc-400">No target set</div>
                )}
              </div>
            </div>

            {/* Right: Admin AE Selector */}
            {isAdmin && (
              <AESelector 
                aes={aeOptions} 
                selectedAEId={selectedAEId} 
                currentView={view}
              />
            )}
          </header>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">Closed Won Amount</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(totalAmount)}</div>
              {targetInfo.target > 0 && (
                <div className={`mt-1 text-xs font-medium ${isAheadOfTarget ? "text-green-600" : "text-red-600"}`}>
                  {isAheadOfTarget ? "▲" : "▼"} {formatCurrency(Math.abs(variance))} ({variancePercent >= 0 ? "+" : ""}{variancePercent.toFixed(1)}%) vs target
                </div>
              )}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">Commission Earned</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(totalCommission)}</div>
              {!aeCommissionPlan && (
                <div className="mt-1 text-xs text-zinc-500">No commission plan assigned.</div>
              )}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">Deals Count</div>
              <div className="mt-2 text-2xl font-semibold">{dealsForTable.length}</div>
            </div>
          </section>

          <DealsTable
            deals={dealsForTable}
            bonusRules={bonusRules}
            baseRate={baseRate}
            view={view}
            selectedAEId={selectedAEId}
          />
        </div>
      </div>
    </div>
  );
}
