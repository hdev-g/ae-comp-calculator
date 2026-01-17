import { getServerSession } from "next-auth";
import Image from "next/image";

import { AttioEmailLinker } from "@/components/AttioEmailLinker";
import { authOptions } from "@/server/auth";
import { prisma } from "@/server/db";

function splitName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const s = (fullName ?? "").trim();
  if (!s) return { firstName: "", lastName: "" };
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function UserIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={props.className}>
      <path
        fillRule="evenodd"
        d="M10 2.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-7 14.5a7 7 0 0 1 14 0 .75.75 0 0 1-.75.75h-12.5A.75.75 0 0 1 3 17Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TrashIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={props.className}>
      <path
        fillRule="evenodd"
        d="M7.5 2.75A.75.75 0 0 1 8.25 2h3.5a.75.75 0 0 1 .75.75V4h3a.75.75 0 0 1 0 1.5h-.78l-.77 11.02A2 2 0 0 1 13.96 18H6.04a2 2 0 0 1-1.99-1.48L3.28 5.5H2.5a.75.75 0 0 1 0-1.5h3V2.75ZM9 4h2V3.5H9V4Zm-2.2 2.5a.75.75 0 0 1 .8.7l.5 8a.75.75 0 0 1-1.5.1l-.5-8a.75.75 0 0 1 .7-.8Zm6.4.7a.75.75 0 1 0-1.5-.1l-.5 8a.75.75 0 1 0 1.5.1l.5-8Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

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

  const profileImage = session?.user?.image ?? null;
  const displayEmail = user?.email ?? session?.user?.email ?? "";
  const displayName = user?.fullName ?? session?.user?.name ?? "";
  const { firstName, lastName } = splitName(displayName);

  const linkedId = user?.aeProfile?.attioWorkspaceMemberId ?? null;
  const linkedMember = linkedId
    ? await prisma.attioWorkspaceMember.findUnique({
        where: { id: linkedId },
        select: { id: true, email: true, fullName: true },
      })
    : null;
  const suggestedMember =
    !linkedId && displayEmail
      ? await prisma.attioWorkspaceMember.findFirst({
          where: { email: { equals: displayEmail, mode: "insensitive" } },
          select: { id: true, email: true, fullName: true },
        })
      : null;

  return (
    <div className="min-h-[calc(100vh-49px)] bg-white px-8 py-10 text-zinc-900">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200">
              <UserIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
              <p className="mt-1 text-sm text-zinc-600">Manage your personal details</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="grid gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <div className="relative size-20 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
                  {profileImage ? (
                    <Image src={profileImage} alt="Profile picture" fill className="object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-zinc-500">
                      <UserIcon className="size-10" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-base font-semibold">Profile Picture</div>
                  <div className="mt-1 text-sm text-zinc-600">We only support PNGs, JPEGs and GIFs under 10MB</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500"
                  disabled
                  title="Coming soon"
                >
                  <span className="grid size-6 place-items-center rounded-md bg-white/10">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
                      <path d="M4 5a2 2 0 0 1 2-2h2.5l.71-1.06A1.5 1.5 0 0 1 10.46 1h1.08a1.5 1.5 0 0 1 1.25.94L13.5 3H16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm6 2.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
                    </svg>
                  </span>
                  Upload new image
                </button>
                <button
                  type="button"
                  aria-label="Remove profile picture"
                  className="grid size-10 place-items-center rounded-lg border border-zinc-200 bg-white text-red-600 hover:bg-zinc-50"
                  disabled
                  title="Coming soon"
                >
                  <TrashIcon className="size-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm text-zinc-600">First Name</label>
                <input
                  value={firstName}
                  readOnly
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-600">Last Name</label>
                <input
                  value={lastName}
                  readOnly
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-zinc-600">Email Address</label>
                <input
                  value={displayEmail}
                  readOnly
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900"
                />
              </div>
            </div>

            <div className="pt-2">
              <AttioEmailLinker email={displayEmail} linkedMember={linkedMember} suggestedMember={suggestedMember} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

