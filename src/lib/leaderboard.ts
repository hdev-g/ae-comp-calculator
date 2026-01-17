import type { Deal } from "@/lib/commission";
import type { Quarter } from "@/lib/quarters";

export type AE = {
  id: string;
  fullName: string;
  email: string;
};

export type DealWithAE = Deal & {
  aeId: string;
};

export type AERow = {
  aeId: string;
  fullName: string;
  email: string;
  dealCount: number;
  closedWonAmount: number;
};

export function computeAeleaderboard(params: {
  aes: AE[];
  deals: DealWithAE[];
  closedWonValue?: string;
}): { totals: { dealCount: number; closedWonAmount: number }; rows: AERow[] } {
  const closedWon = params.closedWonValue ?? "Closed Won";

  const rows: AERow[] = params.aes.map((ae) => {
    const aeDeals = params.deals.filter((d) => d.aeId === ae.id);
    const closedWonDeals = aeDeals.filter((d) => d.status === closedWon);
    const dealCount = closedWonDeals.length;
    const closedWonAmount = closedWonDeals.reduce((sum, d) => sum + (d.amount ?? 0), 0);

    return {
      aeId: ae.id,
      fullName: ae.fullName,
      email: ae.email,
      dealCount,
      closedWonAmount,
    };
  });

  rows.sort((a, b) => b.closedWonAmount - a.closedWonAmount);

  const totals = {
    dealCount: rows.reduce((sum, r) => sum + r.dealCount, 0),
    closedWonAmount: rows.reduce((sum, r) => sum + r.closedWonAmount, 0),
  };

  return { totals, rows };
}

