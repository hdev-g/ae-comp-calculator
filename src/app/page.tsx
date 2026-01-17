import Link from "next/link";

import type { BonusRule, CommissionPlan } from "@/lib/commission";
import { computeAeleaderboard, type AE, type DealWithAE } from "@/lib/leaderboard";
import { formatQuarter, type Quarter } from "@/lib/quarters";

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function getDefaultYearQuarter(): { year: number; quarter: Quarter } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const quarter = (Math.floor(now.getUTCMonth() / 3) + 1) as Quarter;
  return { year, quarter };
}

export default function Home() {
  const fallback = getDefaultYearQuarter();
  const year = fallback.year;
  const quarter = fallback.quarter;

  // Mock data for UI iteration (login/DB/Attio next)
  const aes: AE[] = [
    { id: "ae-1", fullName: "Alex Johnson", email: "alex@wordsmith.ai" },
    { id: "ae-2", fullName: "Sam Lee", email: "sam@wordsmith.ai" },
    { id: "ae-3", fullName: "Taylor Rivera", email: "taylor@wordsmith.ai" },
  ];

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

  const deals: DealWithAE[] = [
    {
      id: "d1",
      aeId: "ae-1",
      dealName: "Acme Starter",
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
      aeId: "ae-2",
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
      aeId: "ae-3",
      dealName: "Initech Pilot",
      accountName: "Initech",
      amount: 20000,
      commissionableAmount: 20000,
      closeDate: "2026-03-03T00:00:00.000Z",
      status: "Open",
      termLengthMonths: 12,
    },
    {
      id: "d4",
      aeId: "ae-1",
      dealName: "Globex Multi-Year",
      accountName: "Globex",
      amount: 250000,
      commissionableAmount: 250000,
      closeDate: "2026-03-22T00:00:00.000Z",
      status: "Closed Won",
      termLengthMonths: 36,
      hasTestimonialCommitment: true,
      hasMarketingCommitment: true,
      isMultiYear: true,
    },
  ];

  const { totals, rows } = computeAeleaderboard({
    year,
    quarter,
    aes,
    deals,
    plans,
    bonusRules,
    closedWonValue: "Closed Won",
  });

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm text-zinc-600">Quarter Overview</div>
              <h1 className="text-2xl font-semibold tracking-tight">{formatQuarter(year, quarter)}</h1>
              <div className="mt-1 text-sm text-zinc-600">
                Consolidated view across all AEs (mock data for now).
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
              >
                View my dashboard
              </Link>
              <a
                href="https://github.com/hdev-g/ae-comp-calculator"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Repo
              </a>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">AEs</div>
              <div className="mt-2 text-2xl font-semibold">{aes.length}</div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">Closed Won Amount</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(totals.closedWonAmount)}</div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <div className="text-sm text-zinc-600">Deals Count</div>
              <div className="mt-2 text-2xl font-semibold">{totals.dealCount}</div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div className="text-sm font-medium">AE Leaderboard</div>
              <div className="text-xs text-zinc-500">Sorted by commission earned</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Rank</th>
                    <th className="px-5 py-3 font-medium">AE</th>
                    <th className="px-5 py-3 font-medium">Deals</th>
                    <th className="px-5 py-3 font-medium">Closed Won</th>
                    <th className="px-5 py-3 font-medium">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.aeId} className="border-t border-zinc-100">
                      <td className="px-5 py-4 text-zinc-700">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-zinc-950">{r.fullName}</div>
                        <div className="text-xs text-zinc-500">{r.email}</div>
                      </td>
                      <td className="px-5 py-4 text-zinc-700">{r.dealCount}</td>
                      <td className="px-5 py-4 text-zinc-700">{formatCurrency(r.closedWonAmount)}</td>
                      <td className="px-5 py-4 font-medium text-zinc-950">
                        {formatCurrency(r.commissionEarned)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
