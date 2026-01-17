import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase() ?? null;
  const userId = session?.user?.id ?? null;

  const user =
    (userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            fullName: true,
            role: true,
            aeProfile: { select: { attioWorkspaceMemberId: true } },
          },
        })
      : null) ??
    (email
      ? await prisma.user.findUnique({
          where: { email },
          select: {
            email: true,
            fullName: true,
            role: true,
            aeProfile: { select: { attioWorkspaceMemberId: true } },
          },
        })
      : null);

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="text-sm text-zinc-600">Settings</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">Account settings</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Placeholder page — we’ll wire Google SSO profile details and preferences here.
          </p>

          <div className="mt-6 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="text-zinc-600">Signed in as</div>
              <div className="font-medium text-zinc-950">{user?.email ?? session?.user?.email ?? "—"}</div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-zinc-600">Role</div>
              <div className="font-medium text-zinc-950">{user?.role ?? session?.user?.role ?? "—"}</div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-zinc-600">Attio member linked</div>
              <div className="font-medium text-zinc-950">
                {user?.aeProfile?.attioWorkspaceMemberId ? "Yes" : "No"}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="text-zinc-600">Attio workspace member id</div>
              <div className="font-mono text-xs text-zinc-800">
                {user?.aeProfile?.attioWorkspaceMemberId ?? "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

