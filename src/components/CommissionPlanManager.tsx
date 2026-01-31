"use client";

import { useCallback, useEffect, useState } from "react";

type BonusRule = {
  id?: string;
  name: string;
  rateAdd: number;
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
  enabled: boolean;
};

type CommissionPlan = {
  id: string;
  name: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  baseCommissionRate: string | number;
  bonusRules: BonusRule[];
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0] ?? "";
}

function formatPercent(rate: string | number): string {
  const n = typeof rate === "string" ? parseFloat(rate) : rate;
  return `${(n * 100).toFixed(2)}%`;
}

export function CommissionPlanManager() {
  const [plans, setPlans] = useState<CommissionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingPlan, setEditingPlan] = useState<CommissionPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/commission-plans");
      const data = (await res.json()) as { plans?: CommissionPlan[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load plans");
      setPlans(data.plans ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  function handleCreate() {
    setEditingPlan({
      id: "",
      name: "",
      effectiveStartDate: new Date().toISOString().split("T")[0]!,
      effectiveEndDate: null,
      baseCommissionRate: 0.1,
      bonusRules: [],
    });
    setIsCreating(true);
  }

  function handleEdit(plan: CommissionPlan) {
    setEditingPlan({
      ...plan,
      effectiveStartDate: formatDate(plan.effectiveStartDate),
      effectiveEndDate: plan.effectiveEndDate ? formatDate(plan.effectiveEndDate) : null,
      bonusRules: plan.bonusRules.map((r) => ({
        ...r,
        effectiveStartDate: r.effectiveStartDate ? formatDate(r.effectiveStartDate) : null,
        effectiveEndDate: r.effectiveEndDate ? formatDate(r.effectiveEndDate) : null,
      })),
    });
    setIsCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this commission plan?")) return;
    try {
      const res = await fetch(`/api/admin/commission-plans/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      fetchPlans();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  function handleCancel() {
    setEditingPlan(null);
    setIsCreating(false);
  }

  async function handleSave(plan: CommissionPlan) {
    try {
      const body = {
        name: plan.name,
        effectiveStartDate: plan.effectiveStartDate,
        effectiveEndDate: plan.effectiveEndDate || null,
        baseCommissionRate:
          typeof plan.baseCommissionRate === "string"
            ? parseFloat(plan.baseCommissionRate)
            : plan.baseCommissionRate,
        bonusRules: plan.bonusRules.map((r) => ({
          name: r.name,
          rateAdd: typeof r.rateAdd === "string" ? parseFloat(r.rateAdd as unknown as string) : r.rateAdd,
          effectiveStartDate: r.effectiveStartDate || null,
          effectiveEndDate: r.effectiveEndDate || null,
          enabled: r.enabled,
        })),
      };

      const url = isCreating
        ? "/api/admin/commission-plans"
        : `/api/admin/commission-plans/${plan.id}`;
      const method = isCreating ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save");
      }

      setEditingPlan(null);
      setIsCreating(false);
      fetchPlans();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    }
  }

  if (loading) {
    return <div className="text-sm text-zinc-500">Loading commission plans…</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  if (editingPlan) {
    return (
      <PlanForm
        plan={editingPlan}
        isCreating={isCreating}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Commission Plans</h2>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500"
        >
          Create Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
          No commission plans yet. Create one to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-zinc-900">{plan.name}</div>
                  <div className="mt-1 text-sm text-zinc-600">
                    Base rate: {formatPercent(plan.baseCommissionRate)}
                  </div>
                  <div className="mt-1 text-sm text-zinc-500">
                    {formatDate(plan.effectiveStartDate)} →{" "}
                    {plan.effectiveEndDate ? formatDate(plan.effectiveEndDate) : "ongoing"}
                  </div>
                  {plan.bonusRules.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1">
                      {plan.bonusRules
                        .filter((r) => r.enabled)
                        .map((r, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-sm text-zinc-600"
                          >
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              +{formatPercent(r.rateAdd)}
                            </span>
                            <span>{r.name}</span>
                            {(r.effectiveStartDate || r.effectiveEndDate) && (
                              <span className="text-xs text-zinc-400">
                                ({formatDate(r.effectiveStartDate) || "—"} → {formatDate(r.effectiveEndDate) || "ongoing"})
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(plan)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(plan.id)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanForm(props: {
  plan: CommissionPlan;
  isCreating: boolean;
  onSave: (plan: CommissionPlan) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(props.plan);
  const [saving, setSaving] = useState(false);

  function updateField<K extends keyof CommissionPlan>(key: K, value: CommissionPlan[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addBonusRule() {
    setForm((f) => ({
      ...f,
      bonusRules: [
        ...f.bonusRules,
        { 
          name: "", 
          rateAdd: 0.01, 
          effectiveStartDate: null, 
          effectiveEndDate: null, 
          enabled: true 
        },
      ],
    }));
  }

  function updateBonusRule(index: number, updates: Partial<BonusRule>) {
    setForm((f) => ({
      ...f,
      bonusRules: f.bonusRules.map((r, i) => (i === index ? { ...r, ...updates } : r)),
    }));
  }

  function removeBonusRule(index: number) {
    setForm((f) => ({
      ...f,
      bonusRules: f.bonusRules.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await props.onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {props.isCreating ? "Create Commission Plan" : "Edit Commission Plan"}
        </h2>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="grid gap-5">
          <div>
            <label className="text-sm font-medium text-zinc-700">Plan Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900"
              placeholder="e.g. Q1 2026 Plan"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-zinc-700">Base Commission Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={
                  typeof form.baseCommissionRate === "number"
                    ? (form.baseCommissionRate * 100).toFixed(2)
                    : parseFloat(form.baseCommissionRate) * 100
                }
                onChange={(e) => updateField("baseCommissionRate", parseFloat(e.target.value) / 100)}
                required
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">Effective Start Date</label>
              <input
                type="date"
                value={form.effectiveStartDate}
                onChange={(e) => updateField("effectiveStartDate", e.target.value)}
                required
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">Effective End Date</label>
              <input
                type="date"
                value={form.effectiveEndDate ?? ""}
                onChange={(e) => updateField("effectiveEndDate", e.target.value || null)}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900"
              />
              <p className="mt-1 text-xs text-zinc-500">Leave blank for ongoing</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-zinc-900">Bonus Rules</div>
            <p className="mt-1 text-sm text-zinc-500">
              Additional commission percentages. Set dates for time-limited incentives.
            </p>
          </div>
          <button
            type="button"
            onClick={addBonusRule}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Add Rule
          </button>
        </div>

        {form.bonusRules.length > 0 && (
          <div className="mt-5 flex flex-col gap-4">
            {form.bonusRules.map((rule, index) => (
              <div
                key={index}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-4"
              >
                <div className="flex flex-wrap items-start gap-4">
                  {/* Rule Name */}
                  <div className="min-w-[200px] flex-1">
                    <label className="text-xs font-medium text-zinc-600">Rule Name</label>
                    <input
                      type="text"
                      value={rule.name}
                      onChange={(e) => updateBonusRule(index, { name: e.target.value })}
                      placeholder="e.g. Multi-year deal bonus"
                      required
                      className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                    />
                  </div>

                  {/* Bonus % */}
                  <div className="w-24">
                    <label className="text-xs font-medium text-zinc-600">Bonus %</label>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-sm text-zinc-600">+</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={(rule.rateAdd * 100).toFixed(2)}
                        onChange={(e) =>
                          updateBonusRule(index, { rateAdd: parseFloat(e.target.value) / 100 })
                        }
                        className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                      />
                      <span className="text-sm text-zinc-600">%</span>
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className="w-36">
                    <label className="text-xs font-medium text-zinc-600">Start Date</label>
                    <input
                      type="date"
                      value={rule.effectiveStartDate ?? ""}
                      onChange={(e) =>
                        updateBonusRule(index, { effectiveStartDate: e.target.value || null })
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm"
                    />
                  </div>

                  {/* End Date */}
                  <div className="w-36">
                    <label className="text-xs font-medium text-zinc-600">End Date</label>
                    <input
                      type="date"
                      value={rule.effectiveEndDate ?? ""}
                      onChange={(e) =>
                        updateBonusRule(index, { effectiveEndDate: e.target.value || null })
                      }
                      className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm"
                    />
                  </div>

                  {/* Enabled & Remove */}
                  <div className="flex items-end gap-3 pb-1">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => updateBonusRule(index, { enabled: e.target.checked })}
                        className="size-4 rounded border-zinc-300"
                      />
                      <span className="text-sm text-zinc-600">Enabled</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeBonusRule(index)}
                      className="text-sm text-red-600 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={props.onCancel}
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : props.isCreating ? "Create Plan" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
