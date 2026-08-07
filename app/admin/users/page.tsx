import { Users } from "lucide-react";
import { listAdminBots, listAdminUsers } from "@/actions/admin/bots";
import { UsersBotsPanel } from "@/components/admin/UsersBotsPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [bots, users] = await Promise.all([listAdminBots(), listAdminUsers()]);
  const enabledBots = bots.filter((b) => b.enabled).length;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-12 -top-16 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl"
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-300 ring-1 ring-sky-400/30">
              <Users className="h-3 w-3" strokeWidth={2.5} />
              Pool
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
              OTP managers · duel bots
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-1.5 text-2xl font-bold tracking-tight text-white">
            Users & Bots
            <AdminHelpTip
              wide
              title="Managers + duel pool"
              text="Real users are OTP managers. Bots fill Draft Duel matchmaking when the queue is cold. Disabled bots stay listed but are skipped."
            />
          </h1>
          <p className="mt-1 text-sm font-medium text-white/70">
            مدیران واقعی و ربات‌های دوئل
          </p>
          <div className="mt-3 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
            <HeroStat label="Users" value={users.length} />
            <HeroStat label="Bots on" value={enabledBots} />
            <HeroStat label="Bots off" value={bots.length - enabledBots} muted />
            <HeroStat label="Bots total" value={bots.length} muted />
          </div>
        </div>
      </div>

      <UsersBotsPanel bots={bots} users={users} />
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
