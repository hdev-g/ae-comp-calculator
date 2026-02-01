"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type BonusRule = {
  id: string;
  name: string;
  rateAdd: number;
  attioAttributeId: string | null;
  attioAttributeName: string | null;
};

type Deal = {
  id: string;
  dealName: string;
  accountName: string | null;
  amount: number;
  closeDate: string;
  appliedBonusRuleIds: string[];
  revOpsApproved: boolean;
};

type DashboardContentProps = {
  deals: Deal[];
  bonusRules: BonusRule[];
  baseRate: number;
  view: string;
  selectedAEId: string | null;
  targetAmount: number;
  annualAcceleratorBonus: number;
  hasCommissionPlan: boolean;
};

function formatCurrency(n: number) {
  return Math.ceil(n).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
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

export function DashboardContent({
  deals: initialDeals,
  bonusRules,
  baseRate,
  view,
  selectedAEId,
  targetAmount,
  annualAcceleratorBonus,
  hasCommissionPlan,
}: DashboardContentProps) {
  const [deals, setDeals] = useState(initialDeals);
  const [updating, setUpdating] = useState<string | null>(null);

  // Sync local state when initialDeals prop changes (e.g., when period changes)
  useEffect(() => {
    setDeals(initialDeals);
  }, [initialDeals]);

  const toggleBonusRule = useCallback(async (dealId: string, ruleId: string, currentlyEnabled: boolean) => {
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
  }, []);

  const calculateCommission = useCallback(
    (deal: Deal) => {
      let totalRate = baseRate;

      for (const rule of bonusRules) {
        if (deal.appliedBonusRuleIds.includes(rule.id)) {
          totalRate += rule.rateAdd;
        }
      }

      return {
        totalRate,
        commission: deal.amount * totalRate,
      };
    },
    [baseRate, bonusRules]
  );

  // Build query params for view toggle links
  const buildQuery = useCallback((newView: string) => {
    const query: Record<string, string> = { view: newView };
    if (selectedAEId) query.ae = selectedAEId;
    return query;
  }, [selectedAEId]);

  // Calculate totals - reactive to deals state changes
  const computedDeals = useMemo(() => {
    return deals.map((deal) => {
      const { totalRate, commission } = calculateCommission(deal);
      return { ...deal, totalRate, commission };
    });
  }, [deals, calculateCommission]);

  const totals = useMemo(() => {
    return computedDeals.reduce(
      (acc, deal) => {
        return {
          amount: acc.amount + deal.amount,
          commission: acc.commission + deal.commission,
        };
      },
      { amount: 0, commission: 0 }
    );
  }, [computedDeals]);

  // Total commission includes deals commission + annual accelerator
  const totalCommissionWithAccelerator = totals.commission + annualAcceleratorBonus;

  // Calculate variance
  const variance = totals.amount - targetAmount;
  const variancePercent = targetAmount > 0 ? (variance / targetAmount) * 100 : 0;
  const isAheadOfTarget = variance >= 0;

  return (
    <>
      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="text-sm text-zinc-600">Closed Won Amount</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrency(totals.amount)}</div>
          {targetAmount > 0 && (
            <div className={`mt-1 text-xs font-medium ${isAheadOfTarget ? "text-green-600" : "text-red-600"}`}>
              {isAheadOfTarget ? "▲" : "▼"} {formatCurrency(Math.abs(variance))} ({variancePercent >= 0 ? "+" : ""}{variancePercent.toFixed(1)}%) vs target
            </div>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="text-sm text-zinc-600">Commission Earned</div>
          <div className="mt-2 text-2xl font-semibold">{formatCurrency(totalCommissionWithAccelerator)}</div>
          <div className={`mt-1 text-xs ${annualAcceleratorBonus > 0 ? "text-violet-600 font-medium" : "text-zinc-400"}`}>
            Annual Accelerators: {formatCurrency(annualAcceleratorBonus)}
          </div>
          {!hasCommissionPlan && (
            <div className="mt-1 text-xs text-zinc-500">No commission plan assigned.</div>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="text-sm text-zinc-600">Deals Count</div>
          <div className="mt-2 text-2xl font-semibold">{computedDeals.length}</div>
          <div className="mt-1 text-xs text-zinc-500">
            ACV: {formatCurrency(computedDeals.length > 0 ? totals.amount / computedDeals.length : 0)}
          </div>
        </div>
      </section>

      {/* Deals Table */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div className="flex flex-col gap-1">
            <div className="text-sm font-medium">Closed Won Deals</div>
            <div className="text-xs text-zinc-500">
              Deal accelerators synced from Attio • Base rate: {formatPercent(baseRate)}
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
                <th className="w-28 px-3 py-3 font-medium text-center">RevOps Status</th>
                <th className="w-20 px-5 py-3 font-medium text-right">Rate</th>
                <th className="w-32 px-5 py-3 font-medium text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {computedDeals.length === 0 ? (
                <tr>
                  <td colSpan={6 + bonusRules.length} className="px-5 py-8 text-center text-zinc-500">
                    No closed won deals in this period.
                  </td>
                </tr>
              ) : (
                <>
                  {computedDeals.map((deal) => {
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
                          const isAttioControlled = !!rule.attioAttributeId;
                          return (
                            <td key={rule.id} className="px-3 py-4 text-center">
                              <div className="relative inline-block group">
                                <button
                                  type="button"
                                  onClick={() => !isAttioControlled && toggleBonusRule(deal.id, rule.id, isEnabled)}
                                  disabled={isUpdating || isAttioControlled}
                                  className={`inline-flex size-8 items-center justify-center rounded-lg border transition-colors ${
                                    isEnabled
                                      ? "border-green-200 bg-green-50 text-green-600"
                                      : "border-zinc-200 bg-white text-zinc-400"
                                  } ${isAttioControlled ? "cursor-not-allowed opacity-70" : "hover:bg-zinc-50"} ${isUpdating ? "opacity-50" : ""}`}
                                >
                                  {isEnabled ? (
                                    <CheckIcon className="size-5" />
                                  ) : (
                                    <XIcon className="size-5" />
                                  )}
                                </button>
                                {isAttioControlled && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    Synced from Attio
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="w-28 px-3 py-4 text-center">
                          {deal.revOpsApproved ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="w-20 px-5 py-4 text-right">
                          <div className="font-medium text-zinc-900">{formatPercent(deal.totalRate)}</div>
                        </td>
                        <td className="w-32 px-5 py-4 text-right font-medium text-zinc-950">
                          {formatCurrency(deal.commission)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-medium">
                    <td className="px-5 py-4 text-zinc-700">Total ({computedDeals.length} deals)</td>
                    <td className="px-5 py-4"></td>
                    <td className="px-5 py-4 text-right text-zinc-900">{formatCurrency(totals.amount)}</td>
                    {bonusRules.map((rule) => (
                      <td key={rule.id} className="px-3 py-4"></td>
                    ))}
                    <td className="w-28 px-3 py-4"></td>
                    <td className="w-20 px-5 py-4"></td>
                    <td className="w-32 px-5 py-4 text-right text-zinc-950">{formatCurrency(totals.commission)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
