import { CommissionPlanManager } from "@/components/CommissionPlanManager";

export default function AdminCommissionPlansPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Commission Plans</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create and manage commission plans with base rates and bonus rules.
        </p>
      </div>
      <CommissionPlanManager />
    </div>
  );
}
