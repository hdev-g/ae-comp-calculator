"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ReportingView = "ytd" | "qtd" | "prevq";

type ReportingRow = {
  id: string;
  name: string;
  jobRole: string;
  commissionPlanName: string | null;
  segment: string;
  territory: string;
  annualTarget: number;
  totalWins: number;
  averagePercent: number;
  dealCommission: number;
  annualAcceleratorBonus: number;
  totalCommissionUsd: number;
  totalCommissionLocal: number;
  payoutCurrency: string;
};

type FilterColumn = "segment" | "role" | "territory" | "commissionPlan" | "payoutCurrency";

const FILTER_COLUMNS: { id: FilterColumn; label: string }[] = [
  { id: "segment", label: "Segment" },
  { id: "role", label: "Position" },
  { id: "territory", label: "Territory" },
  { id: "commissionPlan", label: "Commission Plan" },
  { id: "payoutCurrency", label: "Payout Currency" },
];

function formatCurrency(amount: number, currency = "USD") {
  return Math.ceil(amount).toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function AdminReportingTable({ rows, view }: { rows: ReportingRow[]; view: ReportingView }) {
  const [filterColumn, setFilterColumn] = useState<FilterColumn>("segment");
  const [filterValue, setFilterValue] = useState<string>("all");

  const values = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (filterColumn === "segment") set.add(row.segment);
      if (filterColumn === "role") set.add(row.jobRole);
      if (filterColumn === "territory") set.add(row.territory);
      if (filterColumn === "commissionPlan") set.add(row.commissionPlanName ?? "—");
      if (filterColumn === "payoutCurrency") set.add(row.payoutCurrency);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, filterColumn]);

  const filteredRows = useMemo(() => {
    if (filterValue === "all") return rows;
    return rows.filter((row) => {
      if (filterColumn === "segment") return row.segment === filterValue;
      if (filterColumn === "role") return row.jobRole === filterValue;
      if (filterColumn === "territory") return row.territory === filterValue;
      if (filterColumn === "commissionPlan") return (row.commissionPlanName ?? "—") === filterValue;
      if (filterColumn === "payoutCurrency") return row.payoutCurrency === filterValue;
      return true;
    });
  }, [rows, filterColumn, filterValue]);

  const buildQuery = (newView: ReportingView) => ({ view: newView });

  const exportRows = filteredRows.map((row) => ({
    Name: row.name,
    Position: row.jobRole,
    "Commission Plan": row.commissionPlanName ?? "",
    Segment: row.segment,
    Territory: row.territory,
    "Annual Target": formatCurrency(row.annualTarget),
    "Total Wins ($)": formatCurrency(row.totalWins),
    "Average %": `${row.averagePercent.toFixed(2)}%`,
    "Deal Commission": formatCurrency(row.dealCommission),
    "Annual Accelerator": formatCurrency(row.annualAcceleratorBonus),
    "Total Commission ($)": formatCurrency(row.totalCommissionUsd),
    "Total Commission (Local)": formatCurrency(row.totalCommissionLocal, row.payoutCurrency),
    "Payout Currency": row.payoutCurrency,
  }));

  const toCsvValue = (value: string) => {
    if (value.includes('"') || value.includes(",") || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = useMemo(() => {
    if (exportRows.length === 0) return "";
    const headers = Object.keys(exportRows[0]);
    const lines = [headers.join(",")];
    for (const row of exportRows) {
      const line = headers.map((h) => toCsvValue(String(row[h as keyof typeof row]))).join(",");
      lines.push(line);
    }
    return lines.join("\n");
  }, [exportRows]);

  const downloadCsv = () => {
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const label = view === "prevq" ? "prior-q" : view;
    link.href = url;
    link.download = `admin-reporting-${label}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 text-sm">
          <Link
            href={{ pathname: "/admin/reporting", query: buildQuery("ytd") }}
            className={`rounded-md px-3 py-1.5 ${
              view === "ytd" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            YTD
          </Link>
          <Link
            href={{ pathname: "/admin/reporting", query: buildQuery("qtd") }}
            className={`rounded-md px-3 py-1.5 ${
              view === "qtd" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            QTD
          </Link>
          <Link
            href={{ pathname: "/admin/reporting", query: buildQuery("prevq") }}
            className={`rounded-md px-3 py-1.5 ${
              view === "prevq" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            Prior Q
          </Link>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <select
            value={filterColumn}
            onChange={(e) => {
              setFilterColumn(e.target.value as FilterColumn);
              setFilterValue("all");
            }}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-xs"
          >
            {FILTER_COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="h-9 rounded-md border border-zinc-200 bg-white px-2 text-xs"
          >
            <option value="all">All</option>
            {values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={exportRows.length === 0}
            className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-600">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Position</th>
                <th className="px-5 py-3 font-medium">Commission Plan</th>
                <th className="px-5 py-3 font-medium">Segment</th>
                <th className="px-5 py-3 font-medium">Territory</th>
                <th className="px-5 py-3 font-medium text-right">Annual Target</th>
                <th className="px-5 py-3 font-medium text-right">Total Wins ($)</th>
                <th className="px-5 py-3 font-medium text-right">Average %</th>
                <th className="px-5 py-3 font-medium text-right">Deal Commission</th>
                <th className="px-5 py-3 font-medium text-right">Annual Accelerator</th>
                <th className="px-5 py-3 font-medium text-right">Total Commission ($)</th>
                <th className="px-5 py-3 font-medium text-right">Total Commission (Local)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-zinc-500">
                    No users match this filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-100">
                    <td className="px-5 py-4 font-medium text-zinc-900">{row.name}</td>
                    <td className="px-5 py-4 text-zinc-700">{row.jobRole}</td>
                    <td className="px-5 py-4 text-zinc-700">{row.commissionPlanName ?? "—"}</td>
                    <td className="px-5 py-4 text-zinc-700">{row.segment}</td>
                    <td className="px-5 py-4 text-zinc-700">{row.territory}</td>
                    <td className="px-5 py-4 text-right text-zinc-700">
                      {formatCurrency(row.annualTarget)}
                    </td>
                    <td className="px-5 py-4 text-right text-zinc-700">
                      {formatCurrency(row.totalWins)}
                    </td>
                    <td className="px-5 py-4 text-right text-zinc-700">
                      {row.averagePercent.toFixed(2)}%
                    </td>
                    <td className="px-5 py-4 text-right text-zinc-700">
                      {formatCurrency(row.dealCommission)}
                    </td>
                    <td className="px-5 py-4 text-right text-zinc-700">
                      {formatCurrency(row.annualAcceleratorBonus)}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-zinc-900">
                      {formatCurrency(row.totalCommissionUsd)}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-zinc-900">
                      {formatCurrency(row.totalCommissionLocal, row.payoutCurrency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
