import { AdminAttioSyncButton } from "@/components/AdminAttioSyncButton";

export default function AdminAppsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Apps & Integrations</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Connect external services and sync data.
        </p>
      </div>

      {/* Attio Integration */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-zinc-100">
            <img src="/attio-logo.png" alt="Attio" className="size-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Attio</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Sync workspace members and deals from Attio into your database.
            </p>
            <div className="mt-4">
              <AdminAttioSyncButton />
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder for future integrations */}
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
        <div className="text-sm text-zinc-500">More integrations coming soon...</div>
      </div>
    </div>
  );
}
