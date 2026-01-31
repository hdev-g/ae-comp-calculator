"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BonusRule = {
  id: string;
  name: string;
  rateAdd: number;
};

type Deal = {
  id: string;
  dealName: string;
  accountName: string | null;
  amount: number;
  closeDate: string;
  appliedBonusRuleIds: string[];
};

type DealsTableProps = {
  deals: Deal[];
  bonusRules: BonusRule[];
  baseRate: number;
  view: string;
  selectedAEId: string | null;
};

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

export function DealsTable({ deals: initialDeals, bonusRules, baseRate, view, selectedAEId }: DealsTableProps) {
  const [deals, setDeals] = useState(initialDeals);
  const [updating, setUpdating] = useState<string | null>(null);

  // Sync local state when initialDeals prop changes (e.g., when period changes)
  useEffect(() => {
    setDeals(initialDeals);
  }, [initialDeals]);

  async function toggleBonusRule(dealId: string, ruleId: string, currentlyEnabled: boolean) {
    setUpdating(`${dealId}-${ruleId}`);
    try {
      const res = await fetch(`/api/deals/${dealId}/bonus-rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonusRuleId: ruleId, enabled: !currentlyEnabled }),
      });

      if (!res.ok) {
        throw new Error("Failed to update");
      }

      // Update local state
      setDeals((prev) =>
        prev.map((d) => {
          if (d.id !== dealId) return d;
          const newRuleIds = currentlyEnabled
            ? d.appliedBonusRuleIds.filter((id) => id !== ruleId)
            : [...d.appliedBonusRuleIds, ruleId];
          return { ...d, appliedBonusRuleIds: newRuleIds };
        })
      );
    } catch (e) {
      console.error("Failed to toggle bonus rule:", e);
    } finally {
      setUpdating(null);
    }
  }

  function calculateCommission(deal: Deal) {
    let totalRate = baseRate;
    const appliedBonuses: string[] = [];

    for (const rule of bonusRules) {
      if (deal.appliedBonusRuleIds.includes(rule.id)) {
        totalRate += rule.rateAdd;
        appliedBonuses.push(rule.name);
      }
    }

    return {
      totalRate,
      commission: deal.amount * totalRate,
      appliedBonuses,
    };
  }

  // Build query params for view toggle links
  const buildQuery = (newView: string) => {
    const query: Record<string, string> = { view: newView };
    if (selectedAEId) query.ae = selectedAEId;
    return query;
  };

  // Calculate totals
  const totals = deals.reduce(
    (acc, deal) => {
      const { commission } = calculateCommission(deal);
      return {
        amount: acc.amount + deal.amount,
        commission: acc.commission + commission,
      };
    },
    { amount: 0, commission: 0 }
  );

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium">Closed Won Deals</div>
          <div className="text-xs text-zinc-500">
            Toggle bonuses for each deal • Base rate: {formatPercent(baseRate)}
          </div>
        </div>

        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 text-sm">
          <Link
            href={{ pathname: "/", query: buildQuery("ytd") }}
            className={`rounded-md px-3 py-1.5 ${view === "ytd" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
          >
            YTD
          </Link>
          <Link
            href={{ pathname: "/", query: buildQuery("qtd") }}
            className={`rounded-md px-3 py-1.5 ${view === "qtd" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
          >
            QTD
          </Link>
          <Link
            href={{ pathname: "/", query: buildQuery("prevq") }}
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
              <th className="px-5 py-3 font-medium text-right">Deal Value ($)</th>
              {bonusRules.map((rule) => (
                <th key={rule.id} className="px-3 py-3 font-medium text-center whitespace-nowrap">
                  <div>{rule.name}</div>
                  <div className="text-[10px] font-normal text-zinc-400">+{formatPercent(rule.rateAdd)}</div>
                </th>
              ))}
              <th className="px-5 py-3 font-medium text-right">Rate</th>
              <th className="px-5 py-3 font-medium text-right">Commission</th>
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 ? (
              <tr>
                <td colSpan={5 + bonusRules.length} className="px-5 py-8 text-center text-zinc-500">
                  No closed won deals in this period.
                </td>
              </tr>
            ) : (
              <>
                {deals.map((deal) => {
                  const { totalRate, commission } = calculateCommission(deal);
                  return (
                    <tr key={deal.id} className="border-t border-zinc-100">
                      <td className="px-5 py-4">
                        <div className="font-medium text-zinc-950">{deal.dealName}</div>
                        {deal.accountName && (
                          <div className="text-xs text-zinc-500">{deal.accountName}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-zinc-700">
                        {new Date(deal.closeDate).toLocaleDateString("en-US")}
                      </td>
                      <td className="px-5 py-4 text-right text-zinc-700">
                        {formatCurrency(deal.amount)}
                      </td>
                      {bonusRules.map((rule) => {
                        const isEnabled = deal.appliedBonusRuleIds.includes(rule.id);
                        const isUpdating = updating === `${deal.id}-${rule.id}`;
                        return (
                          <td key={rule.id} className="px-3 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleBonusRule(deal.id, rule.id, isEnabled)}
                              disabled={isUpdating}
                              className={`inline-flex size-8 items-center justify-center rounded-lg border transition-colors ${
                                isEnabled
                                  ? "border-green-200 bg-green-50 text-green-600 hover:bg-green-100"
                                  : "border-zinc-200 bg-white text-zinc-400 hover:bg-zinc-50"
                              } ${isUpdating ? "opacity-50" : ""}`}
                            >
                              {isEnabled ? (
                                <CheckIcon className="size-5" />
                              ) : (
                                <XIcon className="size-5" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-5 py-4 text-right">
                        <div className="font-medium text-zinc-900">{formatPercent(totalRate)}</div>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-zinc-950">
                        {formatCurrency(commission)}
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-medium">
                  <td className="px-5 py-4 text-zinc-700">Total ({deals.length} deals)</td>
                  <td className="px-5 py-4"></td>
                  <td className="px-5 py-4 text-right text-zinc-900">{formatCurrency(totals.amount)}</td>
                  {bonusRules.map((rule) => (
                    <td key={rule.id} className="px-3 py-4"></td>
                  ))}
                  <td className="px-5 py-4"></td>
                  <td className="px-5 py-4 text-right text-zinc-950">{formatCurrency(totals.commission)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
