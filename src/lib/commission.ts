import type { Quarter } from "@/lib/quarters";

export type CommissionPlan = {
  id: string;
  name: string;
  effectiveStartDate: string; // ISO date (date-only or datetime)
  effectiveEndDate?: string | null; // ISO
  baseCommissionRate: number; // e.g. 0.1
};

export type BonusRule = {
  id: string;
  commissionPlanId: string;
  name: string;
  rateAdd: number; // e.g. 0.01
  effectiveStartDate?: string | null; // ISO
  effectiveEndDate?: string | null; // ISO
  enabled: boolean;
};

export type Deal = {
  id: string;
  dealName: string;
  accountName?: string;
  amount: number;
  commissionableAmount: number;
  closeDate: string; // ISO
  status: string;
  termLengthMonths?: number | null;
  isMultiYear?: boolean;
  hasTestimonialCommitment?: boolean;
  hasMarketingCommitment?: boolean;
};

export type DealLineItem = {
  dealId: string;
  appliedBaseRate: number;
  appliedBonusBreakdown: Array<{ name: string; rateAdd: number }>;
  appliedTotalRate: number;
  commissionableAmount: number;
  commissionAmount: number;
};

export type QuarterStatement = {
  year: number;
  quarter: Quarter;
  totalCommission: number;
  totalClosedWonAmount: number;
  lineItems: DealLineItem[];
};

/**
 * Check if a bonus rule is active for a given deal close date.
 * Rules without date constraints are always active.
 */
export function isBonusRuleActiveForDate(rule: BonusRule, closeDateISO: string): boolean {
  if (!rule.enabled) return false;
  
  const closeDate = new Date(closeDateISO);
  
  // Check start date
  if (rule.effectiveStartDate) {
    const startDate = new Date(rule.effectiveStartDate);
    if (closeDate < startDate) return false;
  }
  
  // Check end date
  if (rule.effectiveEndDate) {
    const endDate = new Date(rule.effectiveEndDate);
    if (closeDate > endDate) return false;
  }
  
  return true;
}

export function computeCommissionForDeal(deal: Deal, plan: CommissionPlan, bonusRules: BonusRule[]) {
  const appliedBaseRate = plan.baseCommissionRate;
  
  // Filter bonus rules that are:
  // 1. Associated with this plan
  // 2. Enabled
  // 3. Active for the deal's close date
  const appliedBonusBreakdown = bonusRules
    .filter((r) => r.commissionPlanId === plan.id)
    .filter((r) => isBonusRuleActiveForDate(r, deal.closeDate))
    .map((r) => ({ name: r.name, rateAdd: r.rateAdd }));

  const appliedTotalRate =
    appliedBaseRate + appliedBonusBreakdown.reduce((sum, b) => sum + b.rateAdd, 0);

  const commissionableAmount = deal.commissionableAmount ?? deal.amount;
  const commissionAmount = commissionableAmount * appliedTotalRate;

  return {
    dealId: deal.id,
    appliedBaseRate,
    appliedBonusBreakdown,
    appliedTotalRate,
    commissionableAmount,
    commissionAmount,
  } satisfies DealLineItem;
}

export function selectPlanForCloseDate(plans: CommissionPlan[], closeDateISO: string): CommissionPlan {
  const closeDate = new Date(closeDateISO);
  const active = plans
    .filter((p) => {
      const start = new Date(p.effectiveStartDate);
      const end = p.effectiveEndDate ? new Date(p.effectiveEndDate) : null;
      return closeDate >= start && (end === null || closeDate <= end);
    })
    .sort((a, b) => new Date(b.effectiveStartDate).getTime() - new Date(a.effectiveStartDate).getTime());

  if (!active[0]) throw new Error("No active commission plan found for deal close date.");
  return active[0];
}

export function computeQuarterStatement(params: {
  year: number;
  quarter: Quarter;
  deals: Deal[];
  plans: CommissionPlan[];
  bonusRules: BonusRule[];
  closedWonValue?: string;
}): QuarterStatement {
  const closedWon = params.closedWonValue ?? "Closed Won";
  const qDeals = params.deals.filter((d) => d.status === closedWon);

  const lineItems = qDeals.map((deal) => {
    const plan = selectPlanForCloseDate(params.plans, deal.closeDate);
    return computeCommissionForDeal(deal, plan, params.bonusRules);
  });

  const totalClosedWonAmount = qDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const totalCommission = lineItems.reduce((sum, li) => sum + li.commissionAmount, 0);

  return {
    year: params.year,
    quarter: params.quarter,
    totalClosedWonAmount,
    totalCommission,
    lineItems,
  };
}
