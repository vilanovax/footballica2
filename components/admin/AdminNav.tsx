"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Layers,
  Flag,
  Settings,
  Users,
  Target,
  Trophy,
  Coins,
} from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/questions", label: "Questions", icon: ListChecks, exact: false },
  { href: "/admin/categories", label: "Categories", icon: Layers, exact: false },
  { href: "/admin/missions", label: "Missions", icon: Target, exact: false },
  { href: "/admin/challenges", label: "Challenges", icon: Trophy, exact: false },
  { href: "/admin/config", label: "Economy", icon: Coins, exact: false },
  { href: "/admin/users", label: "Users & Bots", icon: Users, exact: false },
  { href: "/admin/reports", label: "Reports", icon: Flag, exact: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
