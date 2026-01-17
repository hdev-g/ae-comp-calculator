"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ProfilePhotoUploader(props: { hasPhoto: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "deleting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setStatus("uploading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/me/profile-photo", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      router.refresh();
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function remove() {
    setStatus("deleting");
    setError(null);
    try {
      const res = await fetch("/api/me/profile-photo", { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.refresh();
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          if (!file) return;
          void upload(file);
          e.currentTarget.value = "";
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          disabled={status === "uploading" || status === "deleting"}
          onClick={() => inputRef.current?.click()}
        >
          Upload new image
        </button>

        <button
          type="button"
          aria-label="Remove profile picture"
          className="grid size-10 place-items-center rounded-lg border border-zinc-200 bg-white text-red-600 hover:bg-zinc-50 disabled:opacity-50"
          disabled={!props.hasPhoto || status === "uploading" || status === "deleting"}
          onClick={() => void remove()}
          title={props.hasPhoto ? "Remove" : "No photo to remove"}
        >
          <span className="text-sm font-semibold">×</span>
        </button>
      </div>

      {status === "uploading" ? <div className="text-xs text-zinc-500">Uploading…</div> : null}
      {status === "deleting" ? <div className="text-xs text-zinc-500">Deleting…</div> : null}
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}

