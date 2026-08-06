import Image from "next/image";

/**
 * Shared economy art — coin, energy, xp (score), fans.
 * next/image negotiates AVIF/WebP so the large source PNGs stay off the wire.
 */

type ResourceKind = "coin" | "energy" | "xp" | "fans";

const SRC: Record<ResourceKind, string> = {
  coin: "/icons/coin.png",
  energy: "/icons/energy.png",
  xp: "/icons/xp.png",
  fans: "/icons/fans.png",
};

const PX: Record<"sm" | "md" | "lg" | "xl", number> = {
  sm: 20,
  md: 28,
  lg: 40,
  xl: 48,
};

const SIZE: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
};

export function ResourceIcon({
  kind,
  size = "md",
  className,
  priority = false,
}: {
  kind: ResourceKind;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Mark above-the-fold icons (StatusBar) for faster LCP. */
  priority?: boolean;
}) {
  const px = PX[size];
  return (
    <Image
      src={SRC[kind]}
      alt=""
      width={px}
      height={px}
      aria-hidden
      draggable={false}
      priority={priority}
      className={[
        SIZE[size],
        "shrink-0 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]",
        className ?? "",
      ].join(" ")}
    />
  );
}
