import { listAdminBots, listAdminUsers } from "@/actions/admin/bots";
import { UsersBotsPanel } from "@/components/admin/UsersBotsPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [bots, users] = await Promise.all([listAdminBots(), listAdminUsers()]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
          Users & Bots
          <AdminHelpTip
            wide
            title="Managers + duel pool"
            text="Real users are OTP managers. Bots fill Draft Duel matchmaking when the queue is cold. Disabled bots stay listed but are skipped."
          />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          مدیران واقعی و ربات‌های دوئل
        </p>
      </div>

      <UsersBotsPanel bots={bots} users={users} />
    </div>
  );
}
