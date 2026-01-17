import Link from "next/link";
import { getServerSession } from "next-auth";

import { computeQuarterStatement, type BonusRule, type CommissionPlan, type Deal } from "@/lib/commission";
import {
  formatQuarter,
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

function getViewLabel(view: DashboardView) {
  if (view === "ytd") return "Annual-to-date";
  if (view === "qtd") return "QTD";
  return "Previous Q";
}

function filterDealsByCloseDateRange(deals: Deal[], start: Date, end: Date) {
  return deals.filter((d) => {
    const dt = new Date(d.closeDate);
    return dt >= start && dt <= end;
  });
}

function decimalToNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  const anyV = v as any;
  if (anyV && typeof anyV === "object" && typeof anyV.toNumber === "function") {
    const n = anyV.toNumber();
    return typeof n === "number" && Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export default async function DashboardPage(props: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  if (!userId) return null;

  const sp = (await props.searchParams) ?? {};
  const view: DashboardView = isDashboardView(sp.view) ? sp.view : "qtd";
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

  const ae = await prisma.aEProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const dealsFromDb = ae?.id
    ? await prisma.deal.findMany({
        where: {
          aeProfileId: ae.id,
          status: { contains: "won", mode: "insensitive" },
          closeDate: { gte: range.start, lte: range.end },
        },
        orderBy: [{ closeDate: "desc" }],
        take: 500,
      })
    : [];

  const dealsInRange: Deal[] = dealsFromDb.map((d) => ({
    id: d.id,
    dealName: d.dealName,
    accountName: d.accountName ?? undefined,
    amount: decimalToNumber(d.amount),
    commissionableAmount: decimalToNumber(d.commissionableAmount),
    closeDate: d.closeDate.toISOString(),
    status: (d.status ?? "").toLowerCase().includes("won") ? "Won" : d.status,
    termLengthMonths: d.termLengthMonths ?? null,
    isMultiYear: d.isMultiYear,
    hasTestimonialCommitment: d.hasTestimonialCommitment,
    hasMarketingCommitment: d.hasMarketingCommitment,
  }));

  const plansDb = await prisma.commissionPlan.findMany({ orderBy: [{ effectiveStartDate: "desc" }] });
  const bonusDb = await prisma.bonusRule.findMany({});

  const plans: CommissionPlan[] = plansDb.map((p) => ({
    id: p.id,
    name: p.name,
    effectiveStartDate: p.effectiveStartDate.toISOString(),
    effectiveEndDate: p.effectiveEndDate ? p.effectiveEndDate.toISOString() : undefined,
    baseCommissionRate: decimalToNumber(p.baseCommissionRate),
  }));

  const bonusRules: BonusRule[] = bonusDb.map((b) => ({
    id: b.id,
    commissionPlanId: b.commissionPlanId,
    type: b.type as BonusRule["type"],
    rateAdd: decimalToNumber(b.rateAdd),
    enabled: b.enabled,
  }));

  const closedWonDeals = dealsInRange.filter((d) => d.status === "Won");
  const fallbackClosedWonAmount = closedWonDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  const statement = (() => {
    if (plans.length === 0) {
      return { year, quarter, totalClosedWonAmount: fallbackClosedWonAmount, totalCommission: 0, lineItems: [] };
    }
    try {
      return computeQuarterStatement({
        year,
        quarter,
        deals: dealsInRange,
        plans,
        bonusRules,
        closedWonValue: "Won",
      });
    } catch {
      return { year, quarter, totalClosedWonAmount: fallbackClosedWonAmount, totalCommission: 0, lineItems: [] };
    }
  })();

  const lineItemsByDealId = new Map(statement.lineItems.map((li) => [li.dealId, li]));

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm text-zinc-600">AE Dashboard</div>
              <h1 className="text-2xl font-semibold tracking-tight">{formatQuarter(year, quarter)}</h1>
              <div className="mt-1 text-sm text-zinc-600">
                {getViewLabel(view)}
              </div>
            </div>

          </header>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">Closed Won Amount</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(statement.totalClosedWonAmount)}</div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">Commission Earned</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(statement.totalCommission)}</div>
              {plans.length === 0 ? (
                <div className="mt-1 text-xs text-zinc-500">Commission plan not configured yet.</div>
              ) : null}
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">Deals Count</div>
              <div className="mt-2 text-2xl font-semibold">{closedWonDeals.length}</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">Closed Won Deals</div>
                <div className="text-xs text-zinc-500">Rates: base + additive bonuses</div>
              </div>

              <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 text-sm">
                <Link
                  href={{ pathname: "/dashboard", query: { view: "ytd" } }}
                  className={`rounded-md px-3 py-1.5 ${view === "ytd" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
                >
                  YTD
                </Link>
                <Link
                  href={{ pathname: "/dashboard", query: { view: "qtd" } }}
                  className={`rounded-md px-3 py-1.5 ${view === "qtd" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
                >
                  QTD
                </Link>
                <Link
                  href={{ pathname: "/dashboard", query: { view: "prevq" } }}
                  className={`rounded-md px-3 py-1.5 ${view === "prevq" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
                >
                  Prev Q
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Deal</th>
                    <th className="px-5 py-3 font-medium">Close Date</th>
                    <th className="px-5 py-3 font-medium">Commissionable</th>
                    <th className="px-5 py-3 font-medium">Rate</th>
                    <th className="px-5 py-3 font-medium">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {closedWonDeals.map((d) => {
                    const li = lineItemsByDealId.get(d.id);
                    const bonuses = li ? li.appliedBonusBreakdown.map((b) => b.type).join(", ") : "";
                    return (
                      <tr key={d.id} className="border-t border-zinc-100">
                        <td className="px-5 py-4">
                          <div className="font-medium text-zinc-950">{d.dealName}</div>
                          {d.accountName ? <div className="text-xs text-zinc-500">{d.accountName}</div> : null}
                        </td>
                        <td className="px-5 py-4 text-zinc-700">
                          {new Date(d.closeDate).toLocaleDateString("en-US")}
                        </td>
                        <td className="px-5 py-4 text-zinc-700">
                          {formatCurrency(li?.commissionableAmount ?? d.commissionableAmount)}
                        </td>
                        <td className="px-5 py-4 text-zinc-700">
                          {li ? (
                            <>
                              <div className="font-medium">{formatPercent(li.appliedTotalRate)}</div>
                              <div className="text-xs text-zinc-500">
                                base {formatPercent(li.appliedBaseRate)}
                                {bonuses ? ` + ${bonuses}` : ""}
                              </div>
                            </>
                          ) : (
                            <div className="text-zinc-400">—</div>
                          )}
                        </td>
                        <td className="px-5 py-4 font-medium text-zinc-950">
                          {li ? formatCurrency(li.commissionAmount) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

