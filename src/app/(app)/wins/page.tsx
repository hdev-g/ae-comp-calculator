import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

function decimalToNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  const anyV = v as any;
  if (anyV && typeof anyV === "object" && typeof anyV.toNumber === "function") {
    const n = anyV.toNumber();
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

export default async function WinsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const role = session?.user?.role ?? "AE";

  if (!userId) return null;

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
      aeProfile: {
        select: {
          user: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  const totalAmount = wins.reduce((acc, d) => acc + decimalToNumber(d.amount), 0);

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <div className="text-sm text-zinc-600">{role === "ADMIN" ? "All AEs" : "My wins"}</div>
            <h1 className="text-2xl font-semibold tracking-tight">Wins</h1>
            <div className="text-sm text-zinc-600">
              {wins.length} wins • {formatCurrency(totalAmount)} total
            </div>
          </header>

          {wins.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700">
              No wins found yet. If you expect to see deals here, run an Attio sync (Admin) and make sure your Attio
              account is connected.
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
                      const aeLabel = ae?.fullName ?? ae?.email ?? "Unassigned";
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

