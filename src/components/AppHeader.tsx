"use client";

import { usePathname } from "next/navigation";

function getTitle(pathname: string) {
  if (pathname === "/") return "Home";
  if (pathname.startsWith("/dashboard")) return "My dashboard";
  if (pathname.startsWith("/settings")) return "Account settings";
  return "AE Comp";
}

export function AppHeader() {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <div className="flex h-full items-center px-6">
      <div className="text-[14px] leading-5 font-semibold text-zinc-950">{title}</div>
    </div>
  );
}

