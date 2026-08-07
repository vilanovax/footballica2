import { Award } from "lucide-react";
import { listAdminBadges } from "@/actions/admin/badges";
import { BadgesPanel } from "@/components/admin/BadgesPanel";
import {
  AdminHelpTip,
  AdminHowItWorks,
} from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage() {
  const badges = await listAdminBadges();
  const active = badges.filter((b) => b.isActive).length;
  const withImage = badges.filter((b) => b.imageUrl).length;
  const categories = new Set(badges.map((b) => b.category)).size;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-300 ring-1 ring-amber-400/30">
              <Award className="h-3 w-3" strokeWidth={2.5} />
              Trophy
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
              Look · copy · rewards
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            Badges
            <AdminHelpTip
              wide
              title="What you edit here"
              text="Player-facing title, description, icon, and unlock coins/XP. How a badge is earned stays in code — you don’t change unlock rules here."
            />
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            Open a row → change look & copy → Save.
          </p>
          <div className="mt-3 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
            <HeroStat label="Total" value={badges.length} />
            <HeroStat label="Active" value={active} />
            <HeroStat label="With image" value={withImage} muted />
            <HeroStat label="Categories" value={categories} muted />
          </div>
        </div>
      </div>

      <AdminHowItWorks
        title="Simple routine"
        steps={[
          "Open a badge — change emoji or Upload image.",
          "Edit EN/FA title + description players will read.",
          "Set coins/XP if needed, then Save.",
        ]}
      />

      <BadgesPanel initialBadges={badges} />
    </div>
  );
}

function HeroStat({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-1.5 ring-1 ring-white/10">
      <p
        className={[
          "text-sm font-bold tabular-nums",
          muted ? "text-white/85" : "text-white",
        ].join(" ")}
      >
        {value.toLocaleString("en-US")}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/65">
        {label}
      </p>
    </div>
  );
}
