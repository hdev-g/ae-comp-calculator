"use client";

import { useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { SidebarNav } from "@/components/SidebarNav";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppShell(props: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("sidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem("sidebarCollapsed", sidebarCollapsed ? "true" : "false");
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  const sidebarClassName = useMemo(
    () =>
      cx(
        "flex-none overflow-hidden bg-white transition-[width] duration-200 ease-out",
        sidebarCollapsed ? "w-0" : "w-[274px] border-r border-zinc-200",
      ),
    [sidebarCollapsed],
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="flex min-h-screen w-full">
        <aside className={cx("hidden sm:block", sidebarClassName)}>
          <SidebarNav
            onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="h-[49px] w-full border-b border-zinc-200 bg-white">
            <AppHeader
              sidebarCollapsed={sidebarCollapsed}
              onExpandSidebar={() => setSidebarCollapsed(false)}
            />
          </header>
          <main className="min-w-0 flex-1">{props.children}</main>
        </div>
      </div>
    </div>
  );
}

