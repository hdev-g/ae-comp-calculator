"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Member = { id: string; email: string | null; fullName: string | null } | null;

export function AttioEmailLinker(props: {
  email: string;
  linkedMember: Member;
  suggestedMember: Member;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dealsAssigned, setDealsAssigned] = useState<number | null>(null);

  const canConnect = useMemo(() => {
    return Boolean(props.email && props.suggestedMember?.id && !props.linkedMember?.id);
  }, [props.email, props.linkedMember?.id, props.suggestedMember?.id]);

  async function connect() {
    if (!props.suggestedMember?.id) return;
    setStatus("saving");
    setError(null);
    setDealsAssigned(null);
    try {
      const res = await fetch("/api/me/attio-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceMemberId: props.suggestedMember.id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; dealsAssigned?: number };
      if (!res.ok) throw new Error(data.error ?? "Failed to connect Attio account");

      setDealsAssigned(typeof data.dealsAssigned === "number" ? data.dealsAssigned : null);
      setStatus("saved");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to connect Attio account");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          <span className="relative size-5 overflow-hidden rounded-[6px] ring-1 ring-zinc-200">
            <Image src="/attio-logo.png" alt="Attio" fill className="object-contain" />
          </span>
          <span>Attio account</span>
        </div>
        <div className="text-sm text-zinc-600">
          We match your Attio workspace user based on your Google sign-in email:{" "}
          <span className="font-medium text-zinc-900">{props.email || "—"}</span>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
        {props.linkedMember?.id ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-zinc-700">
              <span className="inline-block size-2 rounded-full bg-emerald-500" aria-hidden="true" />
              <span className="font-medium text-zinc-900">Connected</span>
              {props.linkedMember.fullName || props.linkedMember.email ? (
                <span className="text-zinc-600">
                  — {props.linkedMember.fullName ?? props.linkedMember.email}
                </span>
              ) : null}
            </div>
          </div>
        ) : props.suggestedMember?.id ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-zinc-700">
              Suggested match:{" "}
              <span className="font-medium text-zinc-900">{props.suggestedMember.fullName ?? "Attio user"}</span>
              {props.suggestedMember.email ? (
                <span className="text-zinc-600"> ({props.suggestedMember.email})</span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={connect}
              disabled={!canConnect || status === "saving"}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {status === "saving" ? "Connecting…" : "Connect Attio account"}
            </button>
          </div>
        ) : (
          <div className="text-zinc-700">
            No Attio user found for this email yet. Ask an admin to run Attio sync so we can import workspace members.
          </div>
        )}
      </div>

      {status === "saved" ? (
        <div className="mt-3 text-sm text-zinc-700">
          Connected{typeof dealsAssigned === "number" ? ` — ${dealsAssigned} deal(s) assigned.` : "."}
        </div>
      ) : null}

      {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

