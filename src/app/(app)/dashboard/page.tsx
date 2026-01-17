import { computeQuarterStatement, type BonusRule, type CommissionPlan, type Deal } from "@/lib/commission";
import { formatQuarter, type Quarter } from "@/lib/quarters";

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

function getDefaultYearQuarter(): { year: number; quarter: Quarter } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const quarter = (Math.floor(now.getUTCMonth() / 3) + 1) as Quarter;
  return { year, quarter };
}

export default async function DashboardPage(props: {
  searchParams?: Promise<{ year?: string; quarter?: string }>;
}) {
  const sp = (await props.searchParams) ?? {};
  const fallback = getDefaultYearQuarter();
  const year = Number(sp.year ?? fallback.year);
  const quarter = Number(sp.quarter ?? fallback.quarter) as Quarter;

  // Mock data for UI iteration (auth/Attio/DB wired later)
  const plans: CommissionPlan[] = [
    {
      id: "plan-2026",
      name: "2026 AE Plan",
      effectiveStartDate: "2026-01-01T00:00:00.000Z",
      baseCommissionRate: 0.1,
    },
  ];

  const bonusRules: BonusRule[] = [
    { id: "b1", commissionPlanId: "plan-2026", type: "multi_year", rateAdd: 0.01, enabled: true },
    { id: "b2", commissionPlanId: "plan-2026", type: "testimonial", rateAdd: 0.01, enabled: true },
    { id: "b3", commissionPlanId: "plan-2026", type: "marketing", rateAdd: 0.01, enabled: true },
  ];

  const deals: Deal[] = [
    {
      id: "d1",
      dealName: "Wordsmith × Acme",
      accountName: "Acme",
      amount: 50000,
      commissionableAmount: 50000,
      closeDate: "2026-01-15T00:00:00.000Z",
      status: "Closed Won",
      termLengthMonths: 12,
      hasTestimonialCommitment: true,
      hasMarketingCommitment: false,
    },
    {
      id: "d2",
      dealName: "Contoso Expansion",
      accountName: "Contoso",
      amount: 120000,
      commissionableAmount: 120000,
      closeDate: "2026-02-20T00:00:00.000Z",
      status: "Closed Won",
      termLengthMonths: 24,
      hasTestimonialCommitment: false,
      hasMarketingCommitment: true,
    },
    {
      id: "d3",
      dealName: "Initech Pilot",
      accountName: "Initech",
      amount: 20000,
      commissionableAmount: 20000,
      closeDate: "2026-03-03T00:00:00.000Z",
      status: "Open",
      termLengthMonths: 12,
    },
  ];

  const statement = computeQuarterStatement({
    year,
    quarter,
    deals,
    plans,
    bonusRules,
    closedWonValue: "Closed Won",
  });

  const lineItemsByDealId = new Map(statement.lineItems.map((li) => [li.dealId, li]));
  const closedWonDeals = deals.filter((d) => d.status === "Closed Won");

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm text-zinc-600">AE Dashboard</div>
              <h1 className="text-2xl font-semibold tracking-tight">{formatQuarter(year, quarter)}</h1>
              <div className="mt-1 text-sm text-zinc-600">Mock data for UI iteration (Attio/SSO next).</div>
            </div>

            <form className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-700" htmlFor="year">
                  Year
                </label>
                <input
                  id="year"
                  name="year"
                  defaultValue={year}
                  inputMode="numeric"
                  className="h-10 w-24 rounded-md border border-zinc-200 bg-white px-3 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-700" htmlFor="quarter">
                  Quarter
                </label>
                <select
                  id="quarter"
                  name="quarter"
                  defaultValue={quarter}
                  className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value={1}>Q1</option>
                  <option value={2}>Q2</option>
                  <option value={3}>Q3</option>
                  <option value={4}>Q4</option>
                </select>
              </div>
              <button className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800">
                Update
              </button>
            </form>
          </header>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">Closed Won Amount</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(statement.totalClosedWonAmount)}</div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">Commission Earned</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(statement.totalCommission)}</div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">Deals Count</div>
              <div className="mt-2 text-2xl font-semibold">{closedWonDeals.length}</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div className="text-sm font-medium">Closed Won Deals</div>
              <div className="text-xs text-zinc-500">Rates: base + additive bonuses</div>
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
                    if (!li) return null;
                    const bonuses = li.appliedBonusBreakdown.map((b) => b.type).join(", ");
                    return (
                      <tr key={d.id} className="border-t border-zinc-100">
                        <td className="px-5 py-4">
                          <div className="font-medium text-zinc-950">{d.dealName}</div>
                          {d.accountName ? <div className="text-xs text-zinc-500">{d.accountName}</div> : null}
                        </td>
                        <td className="px-5 py-4 text-zinc-700">
                          {new Date(d.closeDate).toLocaleDateString("en-US")}
                        </td>
                        <td className="px-5 py-4 text-zinc-700">{formatCurrency(li.commissionableAmount)}</td>
                        <td className="px-5 py-4 text-zinc-700">
                          <div className="font-medium">{formatPercent(li.appliedTotalRate)}</div>
                          <div className="text-xs text-zinc-500">
                            base {formatPercent(li.appliedBaseRate)}
                            {bonuses ? ` + ${bonuses}` : ""}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium text-zinc-950">{formatCurrency(li.commissionAmount)}</td>
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

