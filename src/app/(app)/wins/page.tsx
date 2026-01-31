import Link from "next/link";
import { getServerSession } from "next-auth";

import {
  getPreviousQuarter,
  getQuarterDateRangeUTC,
  getQuarterForDate,
} from "@/lib/quarters";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

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

function formatCurrency(v: unknown) {
  const n = decimalToNumber(v);
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US");
}

type WinsView = "ytd" | "qtd" | "prevq";

function isWinsView(v: unknown): v is WinsView {
  return v === "ytd" || v === "qtd" || v === "prevq";
}

export default async function WinsPage(props: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const role = session?.user?.role ?? "AE";

  if (!userId) return null;

  const sp = (await props.searchParams) ?? {};
  const view: WinsView = isWinsView(sp.view) ? sp.view : "qtd";

  // Calculate date range based on selected view
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

  const aeProfileId =
    role === "ADMIN"
      ? null
      : (
          await prisma.aEProfile.findUnique({
            where: { userId },
            select: { id: true },
          })
        )?.id ?? null;

  const wins = await prisma.deal.findMany({
    where: {
      ...(aeProfileId ? { aeProfileId } : {}),
      status: { contains: "won", mode: "insensitive" },
      closeDate: { gte: range.start, lte: range.end },
    },
    orderBy: [{ closeDate: "desc" }],
    take: 500,
    select: {
      id: true,
      dealName: true,
      accountName: true,
      amount: true,
      closeDate: true,
      status: true,
      attioOwnerWorkspaceMemberId: true,
      aeProfile: {
        select: {
          user: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  const ownerIds = Array.from(
    new Set(wins.map((w) => w.attioOwnerWorkspaceMemberId).filter((v): v is string => Boolean(v))),
  );
  const owners =
    ownerIds.length > 0
      ? await prisma.attioWorkspaceMember.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
  const ownerById = new Map(owners.map((o) => [o.id, o]));

  const totalAmount = wins.reduce((acc, d) => acc + decimalToNumber(d.amount), 0);

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-zinc-600">{role === "ADMIN" ? "All AEs" : "My wins"}</div>
              <h1 className="text-2xl font-semibold tracking-tight">Wins</h1>
              <div className="text-sm text-zinc-600">
                {wins.length} wins • {formatCurrency(totalAmount)} total
              </div>
            </div>

            {/* Period Selector */}
            <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 text-sm">
              <Link
                href={{ pathname: "/wins", query: { view: "ytd" } }}
                className={`rounded-md px-3 py-1.5 ${view === "ytd" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
              >
                YTD
              </Link>
              <Link
                href={{ pathname: "/wins", query: { view: "qtd" } }}
                className={`rounded-md px-3 py-1.5 ${view === "qtd" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
              >
                QTD
              </Link>
              <Link
                href={{ pathname: "/wins", query: { view: "prevq" } }}
                className={`rounded-md px-3 py-1.5 ${view === "prevq" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
              >
                Prev Q
              </Link>
            </div>
          </header>

          {wins.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700">
              No wins found for this period. Try selecting a different time range.
            </div>
          ) : (
            <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-xs text-zinc-600">
                    <tr>
                      <th className="px-5 py-3 font-medium">Deal</th>
                      <th className="px-5 py-3 font-medium">Close Date</th>
                      {role === "ADMIN" ? <th className="px-5 py-3 font-medium">AE</th> : null}
                      <th className="px-5 py-3 font-medium">Amount</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wins.map((d) => {
                      const ae = d.aeProfile?.user;
                      const owner = d.attioOwnerWorkspaceMemberId
                        ? ownerById.get(d.attioOwnerWorkspaceMemberId) ?? null
                        : null;
                      const aeLabel =
                        ae?.fullName ??
                        ae?.email ??
                        owner?.fullName ??
                        owner?.email ??
                        (d.attioOwnerWorkspaceMemberId ? d.attioOwnerWorkspaceMemberId.slice(0, 8) + "…" : "Unassigned");
                      return (
                        <tr key={d.id} className="border-t border-zinc-100">
                          <td className="px-5 py-4">
                            <div className="font-medium text-zinc-950">{d.dealName}</div>
                            {d.accountName ? <div className="text-xs text-zinc-500">{d.accountName}</div> : null}
                          </td>
                          <td className="px-5 py-4 text-zinc-700">{formatDate(d.closeDate)}</td>
                          {role === "ADMIN" ? <td className="px-5 py-4 text-zinc-700">{aeLabel}</td> : null}
                          <td className="px-5 py-4 text-zinc-700">{formatCurrency(d.amount)}</td>
                          <td className="px-5 py-4 text-zinc-700">{d.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
