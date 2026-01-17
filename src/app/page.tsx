import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-2xl border border-zinc-200 bg-white p-10">
          <div className="text-sm text-zinc-600">Wordsmith</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">AE Compensation Calculator</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Local preview mode (mock data). Google SSO, Attio sync, and approvals coming next.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Open Dashboard
            </Link>
            <a
              href="https://github.com/hdev-g/ae-comp-calculator"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              View Repo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
