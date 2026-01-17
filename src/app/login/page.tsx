"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full rounded-2xl border border-zinc-200 bg-white p-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-white">
              <img src="/wordsmith-logo.svg" alt="Wordsmith" className="size-6" />
            </div>
            <div>
              <div className="text-sm font-semibold">Wordsmith</div>
              <div className="text-xs text-zinc-500">AE Compensation Calculator</div>
            </div>
          </div>

          <h1 className="mt-6 text-lg font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-zinc-600">Use your Google account to continue.</p>

          <button
            type="button"
            className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            Continue with Google
          </button>

          <p className="mt-4 text-xs text-zinc-500">
            Access may be restricted by domain. Contact an admin if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}

