/**
 * Shared economy art — coin, energy, xp (score), fans.
 */

type ResourceKind = "coin" | "energy" | "xp" | "fans";

const SRC: Record<ResourceKind, string> = {
  coin: "/icons/coin.png",
  energy: "/icons/energy.png",
  xp: "/icons/xp.png",
  fans: "/icons/fans.png",
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
}: {
  kind: ResourceKind;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SRC[kind]}
      alt=""
      aria-hidden
      draggable={false}
      className={[
        SIZE[size],
        "shrink-0 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]",
        className ?? "",
      ].join(" ")}
    />
  );
}
