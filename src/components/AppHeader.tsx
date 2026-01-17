"use client";

import { usePathname } from "next/navigation";

function ExpandSidebarIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className={props.className}
    >
      <path d="M3.5 4.5h13a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
      <path d="M6.75 4.5v11" />
      <path d="M10.25 10l2-2v4l-2-2Z" />
    </svg>
  );
}

function getTitle(pathname: string) {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/dashboard")) return "My dashboard";
  if (pathname.startsWith("/settings")) return "Account settings";
  return "AE Comp";
}

export function AppHeader(props: { sidebarCollapsed: boolean; onExpandSidebar: () => void }) {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <div className="flex h-full items-center gap-2 px-6">
      {props.sidebarCollapsed ? (
        <button
          type="button"
          aria-label="Expand sidebar"
          className="grid size-8 place-items-center rounded-md text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
          onClick={props.onExpandSidebar}
        >
          <ExpandSidebarIcon className="size-5" />
        </button>
      ) : null}
      <div className="text-[14px] leading-5 font-semibold text-zinc-950">{title}</div>
    </div>
  );
}

