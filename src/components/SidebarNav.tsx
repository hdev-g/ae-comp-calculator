"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-2 p-4">
      <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        Wordsmith
      </div>

      <div className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto px-3 py-2 text-xs text-zinc-500">Local preview</div>
    </nav>
  );
}

