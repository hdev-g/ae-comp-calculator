"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavItems = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reporting", label: "Reporting" },
  { href: "/admin/commission-plans", label: "Commission Plans" },
  { href: "/admin/fx-rates", label: "FX Rates" },
  { href: "/admin/apps", label: "Apps" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6">
      {adminNavItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative border-b-2 py-4 text-sm font-medium transition-colors ${
              isActive
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
