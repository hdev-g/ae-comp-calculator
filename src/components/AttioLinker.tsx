"use client";

import { useEffect, useMemo, useState } from "react";

type Member = { id: string; email: string | null; fullName: string | null };

export function AttioLinker(props: {
  currentUserEmail: string;
  currentLinkedId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string>(props.currentLinkedId ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const suggestedId = useMemo(() => {
    const email = props.currentUserEmail.toLowerCase();
    const match = members.find((m) => (m.email ?? "").toLowerCase() === email);
    return match?.id ?? null;
  }, [members, props.currentUserEmail]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatus("loading");
      setError(null);
      try {
        const url = new URL("/api/attio/workspace-members", window.location.origin);
        if (query.trim()) url.searchParams.set("q", query.trim());
        const res = await fetch(url.toString(), { cache: "no-store" });
        const data = (await res.json()) as { members?: Member[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load workspace members");
        if (cancelled) return;
        setMembers(data.members ?? []);
        setStatus("idle");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Failed to load workspace members");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    // If no explicit selection and we have a suggested match by email, preselect it.
    if (!selectedId && suggestedId) setSelectedId(suggestedId);
  }, [selectedId, suggestedId]);

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/me/attio-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceMemberId: selectedId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to link Attio account");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1200);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Failed to link Attio account");
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-zinc-100">Sync / link Attio account</div>
          <div className="mt-1 text-xs text-zinc-400">
            Select your Attio workspace user so we can map deals to you correctly.
          </div>
        </div>
        <div className="text-xs text-zinc-400">
          Current:{" "}
          <span className="font-mono text-zinc-200">{props.currentLinkedId ?? "Not linked"}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="md:col-span-1">
          <label className="text-xs text-zinc-400">Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email…"
            className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600"
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs text-zinc-400">Attio user</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-sm text-zinc-100"
          >
            <option value="">Select…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {(m.fullName ?? "Unknown")} — {(m.email ?? "no email")} ({m.id.slice(0, 8)}…)
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-500">
          {status === "loading" ? "Loading…" : null}
          {status === "saving" ? "Saving…" : null}
          {status === "saved" ? "Linked!" : null}
        </div>
        <button
          type="button"
          disabled={!selectedId || status === "loading" || status === "saving"}
          onClick={save}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Link Attio account
        </button>
      </div>
    </div>
  );
}

