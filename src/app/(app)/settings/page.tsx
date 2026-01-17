import { getServerSession } from "next-auth";
import Image from "next/image";

import { AttioEmailLinker } from "@/components/AttioEmailLinker";
import { ProfilePhotoUploader } from "@/components/ProfilePhotoUploader";
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
            profileImageUrl: true,
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
            profileImageUrl: true,
            aeProfile: { select: { attioWorkspaceMemberId: true } },
          },
        })
      : null);

  const profileImage = user?.profileImageUrl ?? session?.user?.image ?? null;
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
                <ProfilePhotoUploader hasPhoto={Boolean(user?.profileImageUrl)} />
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

