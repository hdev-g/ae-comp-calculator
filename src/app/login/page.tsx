"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full rounded-2xl border border-zinc-200 bg-white px-8 py-10 shadow-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white">
            <img src="/wordsmith-logo.svg" alt="Wordsmith" className="size-10" />
          </div>

          <h1 className="mt-6 text-center text-3xl font-semibold tracking-tight">Welcome</h1>

          <button
            type="button"
            className="mt-8 inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 text-[14px] leading-5 font-medium text-zinc-900 hover:bg-zinc-50"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <span className="grid size-6 place-items-center">
              <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.7 1.22 9.2 3.61l6.88-6.88C35.85 2.38 30.35 0 24 0 14.64 0 6.56 5.37 2.55 13.19l7.98 6.2C12.43 13.15 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.5 24.5c0-1.63-.15-3.19-.43-4.7H24v9.01h12.63c-.54 2.9-2.16 5.36-4.6 7.02l7.06 5.48C43.91 36.86 46.5 31.14 46.5 24.5z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.39c-.5-1.48-.78-3.06-.78-4.69s.28-3.21.78-4.69l-7.98-6.2C.92 16.01 0 19.91 0 23.7c0 3.79.92 7.69 2.55 10.89l7.98-6.2z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.35 0 11.69-2.09 15.59-5.69l-7.06-5.48c-1.96 1.32-4.47 2.1-8.53 2.1-6.26 0-11.57-3.65-13.47-8.89l-7.98 6.2C6.56 42.63 14.64 48 24 48z"
                />
              </svg>
            </span>
            Continue with Google
          </button>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Google is the only supported login method. Contact an admin if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}

