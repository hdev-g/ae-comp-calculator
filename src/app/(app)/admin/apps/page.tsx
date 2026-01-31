import { AdminAttioSyncButton } from "@/components/AdminAttioSyncButton";
import { prisma } from "@/server/db";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

export default async function AdminAppsPage() {
  // Get the most recent sync time from deals or members
  const [lastDeal, lastMember] = await Promise.all([
    prisma.deal.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.attioWorkspaceMember.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const lastSyncTime = [lastDeal?.updatedAt, lastMember?.updatedAt]
    .filter((d): d is Date => d instanceof Date)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Apps & Integrations</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Connect external services and sync data.
        </p>
      </div>

      {/* Attio Integration */}
      <div className="w-56 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-100">
            <img src="/attio-logo.png" alt="Attio" className="size-5" />
          </div>
          <h2 className="font-semibold">Attio</h2>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Sync members and deals.
        </p>
        {lastSyncTime && (
          <p className="mt-1 text-xs text-zinc-400">
            Last sync: {formatRelativeTime(lastSyncTime)}
          </p>
        )}
        <div className="mt-3">
          <AdminAttioSyncButton />
        </div>
      </div>

      {/* Placeholder for future integrations */}
      <div className="w-56 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center">
        <div className="text-xs text-zinc-500">More integrations coming soon...</div>
      </div>
    </div>
  );
}
