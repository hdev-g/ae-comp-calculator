import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { FxRateManager } from "@/components/FxRateManager";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export default async function AdminFxRatesPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    redirect("/");
  }

  const rates = await prisma.fxRate.findMany({
    orderBy: [{ year: "desc" }, { currencyCode: "asc" }],
  });

  const serializedRates = rates.map((rate) => ({
    ...rate,
    rate: Number(rate.rate),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">FX Rates</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Set annual exchange rates for payout calculations (per 1 USD).
        </p>
      </div>
      <FxRateManager initialRates={serializedRates} />
    </div>
  );
}
