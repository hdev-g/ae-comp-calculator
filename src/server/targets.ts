export type TargetView = "ytd" | "qtd" | "prevq";

/**
 * Calculate effective target based on view, annual target, and start date.
 * - First quarter after start date = 50% of normal quarterly target
 * - Full year target is adjusted if started mid-year
 * - adjustedAnnualTarget shows the actual annual target accounting for ramp
 */
export function calculateEffectiveTarget(params: {
  annualTarget: number;
  startDate: Date | null;
  view: TargetView;
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
  let adjustedAnnualTarget = annualTarget;
  if (startedThisYear && startQuarter !== null) {
    const fullQuartersRemaining = 4 - startQuarter; // Quarters after the start quarter
    const rampQuarterTarget = quarterlyTarget * 0.5;
    adjustedAnnualTarget = rampQuarterTarget + (fullQuartersRemaining * quarterlyTarget);
  }

  if (view === "qtd") {
    const isRampQuarter = startedThisYear && startQuarter === currentQuarter;
    const target = isRampQuarter ? quarterlyTarget * 0.5 : quarterlyTarget;
    return {
      target,
      adjustedAnnualTarget,
      isRampQuarter,
      label: isRampQuarter ? `Q${currentQuarter} Target (Ramp)` : `Q${currentQuarter} Target`,
    };
  }

  if (view === "ytd") {
    const hasRamp = startedThisYear && startQuarter !== null;
    return {
      target: adjustedAnnualTarget,
      adjustedAnnualTarget,
      isRampQuarter: hasRamp,
      label: hasRamp ? "Annual Target (ramp adjusted)" : "Annual Target",
    };
  }

  if (view === "prevq") {
    const prevQ = currentQuarter === 1 ? 4 : currentQuarter - 1;
    const prevYear = currentQuarter === 1 ? currentYear - 1 : currentYear;
    const isRampQuarter =
      startDate &&
      startDate.getFullYear() === prevYear &&
      Math.floor(startDate.getMonth() / 3) + 1 === prevQ;
    const target = isRampQuarter ? quarterlyTarget * 0.5 : quarterlyTarget;
    return {
      target,
      adjustedAnnualTarget,
      isRampQuarter: !!isRampQuarter,
      label: isRampQuarter ? `Q${prevQ} Target (Ramp)` : `Q${prevQ} Target`,
    };
  }

  return { target: annualTarget, adjustedAnnualTarget, isRampQuarter: false, label: "Annual Target" };
}
