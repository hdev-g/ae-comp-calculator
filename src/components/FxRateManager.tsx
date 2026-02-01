"use client";

import { useMemo, useState } from "react";

type FxRate = {
  id: string;
  currencyCode: string;
  year: number;
  rate: number;
};

const CURRENCY_OPTIONS = ["USD", "GBP", "EUR", "CAD", "AUD"];

export function FxRateManager({ initialRates }: { initialRates: FxRate[] }) {
  const [rates, setRates] = useState<FxRate[]>(initialRates);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [newCurrency, setNewCurrency] = useState("GBP");
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newRate, setNewRate] = useState("");

  const rateDrafts = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rates) {
      map.set(`${r.currencyCode}-${r.year}`, r.rate.toString());
    }
    return map;
  }, [rates]);

  const [draftOverrides, setDraftOverrides] = useState<Record<string, string>>({});

  async function saveRate(currencyCode: string, year: number, rateValue: string) {
    const rate = Number(rateValue);
    if (!currencyCode || !Number.isFinite(year) || !Number.isFinite(rate) || rate <= 0) {
      alert("Enter a valid positive FX rate.");
      return;
    }

    const key = `${currencyCode}-${year}`;
    setSavingKey(key);
    try {
      const res = await fetch("/api/admin/fx-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currencyCode, year, rate }),
      });
      const data = (await res.json()) as { rate?: FxRate; error?: string };
      if (!res.ok || !data.rate) {
        throw new Error(data.error ?? "Failed to save FX rate");
      }

      setRates((prev) => {
        const idx = prev.findIndex(
          (r) => r.currencyCode === data.rate!.currencyCode && r.year === data.rate!.year
        );
        if (idx === -1) return [data.rate!, ...prev];
        const next = [...prev];
        next[idx] = { ...next[idx], rate: data.rate!.rate };
        return next;
      });
      setDraftOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save FX rate");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4">
          <div className="text-sm font-medium">Annual FX Rates</div>
          <div className="text-xs text-zinc-500">Rates are per 1 USD</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-600">
              <tr>
                <th className="px-5 py-3 font-medium">Currency</th>
                <th className="px-5 py-3 font-medium">Year</th>
                <th className="px-5 py-3 font-medium">Rate</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rates.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-zinc-500">
                    No FX rates set yet.
                  </td>
                </tr>
              ) : (
                rates.map((rate) => {
                  const key = `${rate.currencyCode}-${rate.year}`;
                  const value = draftOverrides[key] ?? rateDrafts.get(key) ?? "";
                  return (
                    <tr key={rate.id} className="border-t border-zinc-100">
                      <td className="px-5 py-4 font-medium text-zinc-900">{rate.currencyCode}</td>
                      <td className="px-5 py-4 text-zinc-700">{rate.year}</td>
                      <td className="px-5 py-4">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={value}
                          onChange={(e) =>
                            setDraftOverrides((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="h-8 w-32 rounded-md border border-zinc-200 bg-white px-2 text-xs"
                        />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => saveRate(rate.currencyCode, rate.year, value)}
                          disabled={savingKey === key}
                          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                        >
                          {savingKey === key ? "Saving…" : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="text-sm font-medium">Add FX Rate</div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-medium text-zinc-600">Currency</label>
            <select
              value={newCurrency}
              onChange={(e) => setNewCurrency(e.target.value)}
              className="mt-1 h-9 w-28 rounded-md border border-zinc-200 bg-white px-2 text-xs"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Year</label>
            <input
              type="number"
              value={newYear}
              onChange={(e) => setNewYear(Number(e.target.value))}
              className="mt-1 h-9 w-24 rounded-md border border-zinc-200 bg-white px-2 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Rate</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              className="mt-1 h-9 w-32 rounded-md border border-zinc-200 bg-white px-2 text-xs"
              placeholder="e.g. 0.79"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              saveRate(newCurrency, newYear, newRate);
              setNewRate("");
            }}
            className="h-9 rounded-md bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-500"
          >
            Add / Update
          </button>
        </div>
      </div>
    </div>
  );
}
