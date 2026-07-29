import type { UpgradeKey } from "@/lib/club/upgrades";
import { UPGRADES } from "@/lib/club/upgrades";

const ART: Record<UpgradeKey, string> = {
  STADIUM: "/icons/stadium.png",
  MEDICAL: "/icons/medical.png",
  TRAINING_GROUND: "/icons/training.png",
};

const SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

/** Game art for club upgrades (stadium / training / medical). */
export function UpgradeIcon({
  upgradeKey,
  size = "md",
  className,
}: {
  upgradeKey: UpgradeKey;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const art = ART[upgradeKey];
  if (art) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={art}
        alt=""
        aria-hidden
        draggable={false}
        className={[
          SIZE[size],
          "shrink-0 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
          className ?? "",
        ].join(" ")}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={[
        "inline-flex shrink-0 items-center justify-center text-2xl leading-none",
        SIZE[size],
        className ?? "",
      ].join(" ")}
    >
      {UPGRADES[upgradeKey].icon}
    </span>
  );
}
