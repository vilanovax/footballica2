import { AdminBadge } from "@/components/admin/AdminBadge";
import type { LiveModePlacement } from "@/lib/game/liveModes";

/** Compact Duel / GotD on-off chips for mode content panels. */
export function ModePlacementBadges({
  placement,
}: {
  placement: LiveModePlacement;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AdminBadge tone={placement.duel ? "emerald" : "slate"}>
        Duel {placement.duel ? "on" : "off"}
      </AdminBadge>
      <AdminBadge tone={placement.gotd ? "emerald" : "slate"}>
        GotD {placement.gotd ? "on" : "off"}
      </AdminBadge>
    </div>
  );
}
