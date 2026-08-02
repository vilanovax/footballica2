import { getAdminMemorySnapshot } from "@/actions/admin/memory";
import { MemoryAdminPanel } from "@/components/admin/MemoryAdminPanel";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminMemoryPage() {
  const snapshot = await getAdminMemorySnapshot();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
          Memory Day
          <AdminHelpTip
            wide
            title="حافظه جفت‌ها"
            text="Duel special by default. Boards need active players with distinct ISO nationality codes. Tune pairs & timers here; flip Duel/GotD under Modes."
          />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          حافظه جفت‌ها ·{" "}
          <Link
            href="/admin/modes"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline"
          >
            Modes
          </Link>
          {" · "}
          <Link
            href="/admin/players"
            className="font-medium text-emerald-700 underline-offset-2 hover:underline"
          >
            Players
          </Link>
        </p>
      </div>

      <MemoryAdminPanel snapshot={snapshot} />
    </div>
  );
}
