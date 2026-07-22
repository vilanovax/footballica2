import { listAdminBots, listAdminUsers } from "@/actions/admin/bots";
import { UsersBotsPanel } from "@/components/admin/UsersBotsPanel";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [bots, users] = await Promise.all([listAdminBots(), listAdminUsers()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Users & Bots</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage real OTP managers and the Draft Duel cold-start bot pool.
        </p>
      </div>

      <UsersBotsPanel bots={bots} users={users} />
    </div>
  );
}
