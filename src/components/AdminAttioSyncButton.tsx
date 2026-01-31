"use client";

import { useState } from "react";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

export function AdminAttioSyncButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setStatus("running");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/attio/sync", { method: "POST" });
      const json = (await res.json().catch(() => null)) as unknown;
      const data = asRecord(json);
      if (!res.ok) throw new Error((data?.["error"] as string | undefined) ?? `Sync failed (${res.status})`);
      setStatus("done");
      setMessage(
        `OK: members=${String(data?.["membersFetched"] ?? "?")}, deals=${String(data?.["dealsFetched"] ?? "?")}, parsed=${String(data?.["dealsParsed"] ?? "?")}`,
      );
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Sync failed");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={run}
        disabled={status === "running"}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {status === "running" ? "Running…" : "Run Attio sync"}
      </button>
      {message ? (
        <div className={status === "error" ? "text-sm text-red-300" : "text-sm text-zinc-200"}>
          {message}
        </div>
      ) : null}
    </div>
  );
}

