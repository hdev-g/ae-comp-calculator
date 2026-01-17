import Link from "next/link";

import { computeAeleaderboard, type AE, type DealWithAE } from "@/lib/leaderboard";
import { formatQuarter, getPreviousQuarter, getQuarterDateRangeUTC, type Quarter } from "@/lib/quarters";

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function getDefaultYearQuarter(): { year: number; quarter: Quarter } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const quarter = (Math.floor(now.getUTCMonth() / 3) + 1) as Quarter;
  return { year, quarter };
}

type HomeView = "ytd" | "qtd" | "prevq";

function getViewLabel(view: HomeView) {
  if (view === "ytd") return "Annual-to-date";
  if (view === "qtd") return "QTD";
  return "Previous Q";
}

function isHomeView(v: unknown): v is HomeView {
  return v === "ytd" || v === "qtd" || v === "prevq";
}

function filterDealsByCloseDateRange(deals: DealWithAE[], start: Date, end: Date) {
  return deals.filter((d) => {
    const dt = new Date(d.closeDate);
    return dt >= start && dt <= end;
  });
}

export default async function Home(props: {
  searchParams?: Promise<{ year?: string; quarter?: string; view?: string }>;
}) {
  const sp = (await props.searchParams) ?? {};
  const fallback = getDefaultYearQuarter();
  const year = Number(sp.year ?? fallback.year);
  const quarter = Number(sp.quarter ?? fallback.quarter) as Quarter;
  const view: HomeView = isHomeView(sp.view) ? sp.view : "qtd";
  const now = new Date();

  // Mock data for UI iteration (login/DB/Attio next)
  const aes: AE[] = [
    { id: "ae-1", fullName: "Alex Johnson", email: "alex@wordsmith.ai" },
    { id: "ae-2", fullName: "Sam Lee", email: "sam@wordsmith.ai" },
    { id: "ae-3", fullName: "Taylor Rivera", email: "taylor@wordsmith.ai" },
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

  const dealsInRange = filterDealsByCloseDateRange(deals, range.start, range.end);

  const { totals, rows } = computeAeleaderboard({
    aes,
    deals: dealsInRange,
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
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium">AE Leaderboard</div>
                <div className="text-xs text-zinc-500">{getViewLabel(view)} • sorted by Closed Won amount</div>
              </div>

              <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 text-sm">
                <Link
                  href={{ pathname: "/", query: { year, quarter, view: "ytd" } }}
                  className={`rounded-md px-3 py-1.5 ${view === "ytd" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
                >
                  YTD
                </Link>
                <Link
                  href={{ pathname: "/", query: { year, quarter, view: "qtd" } }}
                  className={`rounded-md px-3 py-1.5 ${view === "qtd" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
                >
                  QTD
                </Link>
                <Link
                  href={{ pathname: "/", query: { year, quarter, view: "prevq" } }}
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
                    <th className="px-5 py-3 font-medium">Rank</th>
                    <th className="px-5 py-3 font-medium">AE</th>
                    <th className="px-5 py-3 font-medium">Deals</th>
                    <th className="px-5 py-3 font-medium">Closed Won</th>
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
