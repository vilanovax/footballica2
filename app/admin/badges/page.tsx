import { listAdminBadges } from "@/actions/admin/badges";
import { BadgesPanel } from "@/components/admin/BadgesPanel";
import {
  AdminHelpTip,
  AdminHowItWorks,
} from "@/components/admin/AdminHelpTip";

export const dynamic = "force-dynamic";

export default async function AdminBadgesPage() {
  const badges = await listAdminBadges();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="flex items-center gap-1.5 text-xl font-semibold text-slate-900">
          Badges
          <AdminHelpTip
            wide
            title="What you edit here"
            text="Player-facing title, description, icon, and unlock coins/XP. How a badge is earned stays in code — you don’t change unlock rules here."
          />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Open a row → change look & copy → Save.
        </p>
      </div>

      <AdminHowItWorks
        title="Simple routine"
        steps={[
          "Open a badge — change emoji or Upload image (step 1).",
          "Edit EN/FA title + description players will read (step 2).",
          "Set coins/XP if needed, then Save (step 3).",
        ]}
      />

      <BadgesPanel initialBadges={badges} />
    </div>
  );
}
