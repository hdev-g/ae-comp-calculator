"use client";

import { useEffect, useState } from "react";

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
  annualTarget: string | number | null;
  startDate: string | null;
  user: {
    id: string;
    fullName: string | null;
    email: string;
    profileImageUrl: string | null;
    role: "AE" | "ADMIN";
  };
};

const JOB_ROLES = ["Account Executive", "Account Manager", "Revenue Operations"];
const SEGMENTS = ["Mid-Market", "Enterprise", "Expansion"];
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

// Format number with comma separators
function formatNumberWithCommas(num: number | null): string {
  if (num === null || num === 0) return "";
  return num.toLocaleString("en-US");
}

// Parse number from string with commas
function parseNumberWithCommas(str: string): number {
  const cleaned = str.replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Input that only saves on blur (not on every keystroke)
function DebouncedNumberInput({
  value,
  onSave,
  disabled,
  placeholder,
  className,
}: {
  value: number | null;
  onSave: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(formatNumberWithCommas(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync local value when prop changes (e.g., after save) - but only if not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(formatNumberWithCommas(value));
    }
  }, [value, isFocused]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={localValue}
      onChange={(e) => {
        // Allow only numbers and commas
        const cleaned = e.target.value.replace(/[^0-9,]/g, "");
        setLocalValue(cleaned);
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        const num = parseNumberWithCommas(localValue);
        // Format the display value with commas
        setLocalValue(formatNumberWithCommas(num || null));
        onSave(num);
      }}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}

// Date input that only saves on blur
function DebouncedDateInput({
  value,
  onSave,
  disabled,
  className,
}: {
  value: string | null;
  onSave: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState(value ? value.split("T")[0] : "");

  useEffect(() => {
    setLocalValue(value ? value.split("T")[0] : "");
  }, [value]);

  return (
    <input
      type="date"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        onSave(localValue);
      }}
      disabled={disabled}
      className={className}
    />
  );
}

export function UserProfileManager({
  initialProfiles,
  initialCommissionPlans,
}: {
  initialProfiles: UserProfile[];
  initialCommissionPlans: CommissionPlanOption[];
}) {
  const [profiles, setProfiles] = useState<UserProfile[]>(initialProfiles);
  const [commissionPlans, setCommissionPlans] = useState<CommissionPlanOption[]>(
    initialCommissionPlans
  );
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => {
    setProfiles(initialProfiles);
    setCommissionPlans(initialCommissionPlans);
  }, [initialProfiles, initialCommissionPlans]);

  async function handleUpdate(
    id: string, 
    field: "jobRole" | "segment" | "territory" | "commissionPlanId" | "isAdmin" | "annualTarget" | "startDate", 
    value: string | boolean | number
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
              <th className="w-[240px] min-w-[240px] px-4 py-3 font-medium">User</th>
              <th className="px-2 py-3 font-medium">Role</th>
              <th className="px-2 py-3 font-medium">Segment</th>
              <th className="px-2 py-3 font-medium">Territory</th>
              <th className="px-2 py-3 font-medium">Commission Plan</th>
              <th className="px-2 py-3 font-medium">Annual Target</th>
              <th className="px-2 py-3 font-medium">Start Date</th>
              <th className="px-2 py-3 font-medium">Access</th>
              <th className="px-2 py-3 font-medium text-center">Attio</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const isAdmin = profile.user.role === "ADMIN";
              const isAttioLinked = !!profile.attioWorkspaceMemberId;
              return (
                <tr key={profile.id} className="border-t border-zinc-100">
                  <td className="w-[240px] min-w-[240px] px-4 py-4">
                    <div className="flex items-center gap-3">
                      {profile.user.profileImageUrl ? (
                        <img
                          src={profile.user.profileImageUrl}
                          alt={profile.user.fullName ?? profile.user.email}
                          className="size-9 flex-shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-600">
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
                  <td className="px-2 py-4">
                    <select
                      value={profile.jobRole ?? ""}
                      onChange={(e) => handleUpdate(profile.id, "jobRole", e.target.value)}
                      disabled={saving === profile.id}
                      className="h-8 w-[120px] rounded-md border border-zinc-200 bg-white px-2 text-xs disabled:opacity-50"
                    >
                      <option value="">Not set</option>
                      {JOB_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-4">
                    <select
                      value={profile.segment ?? ""}
                      onChange={(e) => handleUpdate(profile.id, "segment", e.target.value)}
                      disabled={saving === profile.id}
                      className="h-8 w-[90px] rounded-md border border-zinc-200 bg-white px-2 text-xs disabled:opacity-50"
                    >
                      <option value="">Not set</option>
                      {SEGMENTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-4">
                    <select
                      value={profile.territory ?? ""}
                      onChange={(e) => handleUpdate(profile.id, "territory", e.target.value)}
                      disabled={saving === profile.id}
                      className="h-8 w-[100px] rounded-md border border-zinc-200 bg-white px-2 text-xs disabled:opacity-50"
                    >
                      <option value="">Not set</option>
                      {TERRITORIES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-4">
                    <select
                      value={profile.commissionPlanId ?? ""}
                      onChange={(e) => handleUpdate(profile.id, "commissionPlanId", e.target.value)}
                      disabled={saving === profile.id}
                      className="h-8 w-[130px] rounded-md border border-zinc-200 bg-white px-2 text-xs disabled:opacity-50"
                    >
                      <option value="">Not assigned</option>
                      {commissionPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-zinc-500">$</span>
                      <DebouncedNumberInput
                        value={profile.annualTarget ? Number(profile.annualTarget) : null}
                        onSave={(val) => handleUpdate(profile.id, "annualTarget", val)}
                        placeholder="0"
                        disabled={saving === profile.id}
                        className="h-8 w-[90px] rounded-md border border-zinc-200 bg-white px-2 text-xs disabled:opacity-50"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-4">
                    <DebouncedDateInput
                      value={profile.startDate}
                      onSave={(val) => handleUpdate(profile.id, "startDate", val)}
                      disabled={saving === profile.id}
                      className="h-8 w-[110px] rounded-md border border-zinc-200 bg-white px-2 text-xs disabled:opacity-50"
                    />
                  </td>
                  <td className="px-2 py-4">
                    <select
                      value={isAdmin ? "admin" : "member"}
                      onChange={(e) => handleUpdate(profile.id, "isAdmin", e.target.value === "admin")}
                      disabled={saving === profile.id}
                      className="h-8 w-[80px] rounded-md border border-zinc-200 bg-white px-2 text-xs disabled:opacity-50"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-2 py-4 text-center">
                    <div
                      className={`inline-flex size-7 items-center justify-center rounded-lg border ${
                        isAttioLinked
                          ? "border-green-200 bg-green-50 text-green-600"
                          : "border-zinc-200 bg-zinc-50 text-zinc-400"
                      }`}
                      title={isAttioLinked ? "Synced with Attio" : "Not synced with Attio"}
                    >
                      {isAttioLinked ? (
                        <CheckIcon className="size-4" />
                      ) : (
                        <XIcon className="size-4" />
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
