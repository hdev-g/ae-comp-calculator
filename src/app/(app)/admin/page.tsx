import { getServerSession } from "next-auth";

import { AdminAttioSyncButton } from "@/components/AdminAttioSyncButton";
import { authOptions } from "@/server/auth";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? null;

  if (!session?.user?.email) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-6">
          <div className="text-sm text-zinc-600">Admin</div>
          <h1 className="mt-1 text-xl font-semibold">Sign in required</h1>
        </div>
      </div>
    );
  }

  if (role !== "ADMIN") {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-6">
          <div className="text-sm text-zinc-600">Admin</div>
          <h1 className="mt-1 text-xl font-semibold">Forbidden</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Your account is not an admin. Add your email to <code className="font-mono">SEED_ADMIN_EMAILS</code> and sign out/in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-49px)] bg-zinc-950 px-8 py-10 text-zinc-50">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-zinc-400">Admin</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Attio sync</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Pull workspace members and deals from Attio into the database.
          </p>

          <div className="mt-6">
            <AdminAttioSyncButton />
          </div>
        </div>
      </div>
    </div>
  );
}

