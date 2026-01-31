import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/AdminNav";
import { authOptions } from "@/server/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
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
    <div className="min-h-[calc(100vh-49px)]">
      {/* Admin Sub-navigation */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-6">
          <AdminNav />
        </div>
      </div>

      {/* Page Content */}
      <div className="px-6 py-8">
        <div className="mx-auto max-w-5xl">
          {children}
        </div>
      </div>
    </div>
  );
}
