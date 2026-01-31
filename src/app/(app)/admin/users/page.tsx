import { UserProfileManager } from "@/components/UserProfileManager";

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage user profiles, segments, territories, and commission plans.
        </p>
      </div>
      <UserProfileManager />
    </div>
  );
}
