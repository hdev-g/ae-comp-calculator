"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

function ChevronDownIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={props.className}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.11l3.71-3.88a.75.75 0 1 1 1.08 1.04l-4.24 4.43a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PanelIcon(props: { className?: string }) {
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
      <path d="M7 4.5v11" />
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "My dashboard" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function SidebarNav(props: { onToggleCollapsed: () => void }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!menuOpen) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (menuWrapRef.current && !menuWrapRef.current.contains(target)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (!menuOpen) return;
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <nav className="flex h-full flex-col">
      {/* Header (matches screenshot styling; swap mark once icon is uploaded) */}
      <div className="h-[49px] border-b border-zinc-200 bg-white px-3">
        <div className="flex h-full items-center justify-between">
          <div className="relative" ref={menuWrapRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[14px] leading-5 font-semibold text-zinc-950 hover:bg-zinc-50"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <div className="grid size-7 place-items-center rounded-md bg-white ring-1 ring-zinc-200">
                <img src="/wordsmith-logo.svg" alt="Wordsmith" className="size-4.5" />
              </div>
              <span className="truncate">Wordsmith</span>
              <ChevronDownIcon className="size-4 text-zinc-500" />
            </button>

            {menuOpen ? (
              <div
                id={menuId}
                role="menu"
                aria-label="Workspace menu"
                className="absolute left-0 top-11 z-50 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
              >
                <Link
                  href="/settings"
                  role="menuitem"
                  className="block px-3 py-2 text-[14px] leading-5 text-zinc-900 hover:bg-zinc-50"
                  onClick={() => setMenuOpen(false)}
                >
                  Account settings
                </Link>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Collapse sidebar"
            className="grid size-9 place-items-center rounded-md text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
            onClick={() => {
              setMenuOpen(false);
              props.onToggleCollapsed();
            }}
          >
            <PanelIcon className="size-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 bg-white p-4">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "rounded-md px-3 py-2 text-[14px] leading-5 font-medium transition-colors",
                active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100",
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="mt-auto px-3 py-2 text-xs text-zinc-500">Local preview</div>
      </div>

    </nav>
  );
}

