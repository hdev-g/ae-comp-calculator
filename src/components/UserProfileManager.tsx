"use client";

import { useCallback, useEffect, useState } from "react";

type CommissionPlanOption = {
  id: string;
  name: string;
};

type UserProfile = {
  id: string;
  jobRole: string | null;
  segment: string | null;
  territory: string | null;
  commissionPlanId: string | null;
  commissionPlan: CommissionPlanOption | null;
  attioWorkspaceMemberId: string | null;
  user: {
    id: string;
    fullName: string | null;
    email: string;
    profileImageUrl: string | null;
    role: "AE" | "ADMIN";
  };
};

const JOB_ROLES = ["Account Executive", "Account Manager", "Revenue Operations"];
const SEGMENTS = ["Mid-Market", "Enterprise", "SMB", "Strategic"];
const TERRITORIES = ["North America", "EMEA", "APAC", "LATAM"];

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "");
  }
  return name.slice(0, 2).toUpperCase();
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

export function UserProfileManager() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [commissionPlans, setCommissionPlans] = useState<CommissionPlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ae-profiles");
      const data = (await res.json()) as { 
        profiles?: UserProfile[]; 
        commissionPlans?: CommissionPlanOption[];
        error?: string 
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load users");
      setProfiles(data.profiles ?? []);
      setCommissionPlans(data.commissionPlans ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  async function handleUpdate(
    id: string, 
    field: "jobRole" | "segment" | "territory" | "commissionPlanId" | "isAdmin", 
    value: string | boolean
  ) {
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/ae-profiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed to update");
      
      const data = (await res.json()) as { profile: UserProfile };
      
      // Update local state with the returned profile
      setProfiles((prev) =>
        prev.map((p) => (p.id === id ? data.profile : p))
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <div className="text-sm text-zinc-500">Loading users…</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        No users found. Users are created when they sign in with Google SSO.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-600">
            <tr>
              <th className="w-[260px] min-w-[260px] px-5 py-3 font-medium">User</th>
              <th className="px-3 py-3 font-medium">Role</th>
              <th className="px-3 py-3 font-medium">Segment</th>
              <th className="px-3 py-3 font-medium">Territory</th>
              <th className="px-3 py-3 font-medium">Commission Plan</th>
              <th className="px-3 py-3 font-medium">Access</th>
              <th className="px-3 py-3 font-medium text-center">Attio</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const isAdmin = profile.user.role === "ADMIN";
              const isAttioLinked = !!profile.attioWorkspaceMemberId;
              return (
                <tr key={profile.id} className="border-t border-zinc-100">
                  <td className="w-[260px] min-w-[260px] px-5 py-4">
                    <div className="flex items-center gap-3">
                      {profile.user.profileImageUrl ? (
                        <img
                          src={profile.user.profileImageUrl}
                          alt={profile.user.fullName ?? profile.user.email}
                          className="size-10 flex-shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600">
                          {getInitials(profile.user.fullName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium text-zinc-950">
                          {profile.user.fullName ?? "—"}
                        </div>
                        <div className="truncate text-xs text-zinc-500">{profile.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <select
                      value={profile.jobRole ?? ""}
                      onChange={(e) => handleUpdate(profile.id, "jobRole", e.target.value)}
                      disabled={saving === profile.id}
                      className="h-8 w-[130px] rounded-md border border-zinc-200 bg-white px-2 text-xs disabled:opacity-50"
                    >
                      <option value="">Not set</option>
                      {JOB_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-4">
                    <select
                      value={profile.segment ?? ""}
                      onChange={(e) => handleUpdate(profile.id, "segment", e.target.value)}
                      disabled={saving === profile.id}
                      className="h-8 w-[100px] rounded-md border border-zinc-200 bg-white px-2 text-xs disabled:opacity-50"
                    >
                      <option value="">Not set</option>
                      {SEGMENTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-4">
                    <select
                      value={profile.territory ?? ""}
                      onChange={(e) => handleUpdate(profile.id, "territory", e.target.value)}
                      disabled={saving === profile.id}
                      className="h-8 w-[110px] rounded-md border border-zinc-200 bg-white px-2 text-xs disabled:opacity-50"
                    >
                      <option value="">Not set</option>
                      {TERRITORIES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-4">
                    <select
                      value={profile.commissionPlanId ?? ""}
                      onChange={(e) => handleUpdate(profile.id, "commissionPlanId", e.target.value)}
                      disabled={saving === profile.id}
                      className="h-8 w-[140px] rounded-md border border-zinc-200 bg-white px-2 text-xs disabled:opacity-50"
                    >
                      <option value="">Not assigned</option>
                      {commissionPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-4">
                    <select
                      value={isAdmin ? "admin" : "member"}
                      onChange={(e) => handleUpdate(profile.id, "isAdmin", e.target.value === "admin")}
                      disabled={saving === profile.id}
                      className="h-8 w-[90px] rounded-md border border-zinc-200 bg-white px-2 text-xs disabled:opacity-50"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <div
                      className={`inline-flex size-8 items-center justify-center rounded-lg border ${
                        isAttioLinked
                          ? "border-green-200 bg-green-50 text-green-600"
                          : "border-zinc-200 bg-zinc-50 text-zinc-400"
                      }`}
                      title={isAttioLinked ? "Synced with Attio" : "Not synced with Attio"}
                    >
                      {isAttioLinked ? (
                        <CheckIcon className="size-5" />
                      ) : (
                        <XIcon className="size-5" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
