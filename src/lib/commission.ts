import type { Quarter } from "@/lib/quarters";

export type CommissionPlan = {
  id: string;
  name: string;
  effectiveStartDate: string; // ISO date (date-only or datetime)
  effectiveEndDate?: string; // ISO
  baseCommissionRate: number; // e.g. 0.1
};

export type BonusRuleType = "multi_year" | "testimonial" | "marketing";

export type BonusRule = {
  id: string;
  commissionPlanId: string;
  type: BonusRuleType;
  rateAdd: number; // e.g. 0.01
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
  appliedBonusBreakdown: Array<{ type: BonusRuleType; rateAdd: number }>;
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

export function isBonusRuleApplicable(deal: Deal, type: BonusRuleType): boolean {
  if (type === "multi_year") {
    const term = deal.termLengthMonths ?? null;
    return Boolean(deal.isMultiYear) || (term !== null && term >= 24);
  }
  if (type === "testimonial") return Boolean(deal.hasTestimonialCommitment);
  if (type === "marketing") return Boolean(deal.hasMarketingCommitment);
  return false;
}

export function computeCommissionForDeal(deal: Deal, plan: CommissionPlan, bonusRules: BonusRule[]) {
  const appliedBaseRate = plan.baseCommissionRate;
  const appliedBonusBreakdown = bonusRules
    .filter((r) => r.enabled && r.commissionPlanId === plan.id)
    .filter((r) => isBonusRuleApplicable(deal, r.type))
    .map((r) => ({ type: r.type, rateAdd: r.rateAdd }));

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

