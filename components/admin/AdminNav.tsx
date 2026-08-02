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
  Medal,
  ContactRound,
  Search,
  Grid3x3,
  LayoutGrid,
  Route,
  Brain,
  type LucideIcon,
} from "lucide-react";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  links: NavLink[];
};

const GROUPS: NavGroup[] = [
  {
    label: "Bank",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/questions", label: "Questions", icon: ListChecks },
      { href: "/admin/categories", label: "Categories", icon: Layers },
      { href: "/admin/players", label: "Players", icon: ContactRound },
    ],
  },
  {
    label: "Live-Ops",
    links: [
      { href: "/admin/modes", label: "Modes", icon: LayoutGrid },
      { href: "/admin/mystery", label: "Mystery", icon: Search },
      { href: "/admin/grid", label: "Grid", icon: Grid3x3 },
      { href: "/admin/star-path", label: "Star Path", icon: Route },
      { href: "/admin/memory", label: "Memory", icon: Brain },
      { href: "/admin/missions", label: "Missions", icon: Target },
      { href: "/admin/challenges", label: "Challenges", icon: Trophy },
      { href: "/admin/badges", label: "Badges", icon: Medal },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/admin/config", label: "Game Config", icon: Coins },
      { href: "/admin/users", label: "Users & Bots", icon: Users },
      { href: "/admin/reports", label: "Reports", icon: Flag },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.links.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
