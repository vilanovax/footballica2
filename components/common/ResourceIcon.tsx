/**
 * Shared coin / energy art for economy UI — larger & clearer than emoji.
 */

type ResourceKind = "coin" | "energy";

const SRC: Record<ResourceKind, string> = {
  coin: "/icons/coin.png",
  energy: "/icons/energy.png",
};

const SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function ResourceIcon({
  kind,
  size = "md",
  className,
}: {
  kind: ResourceKind;
  size?: "sm" | "md" | "lg";
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
        "shrink-0 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
        className ?? "",
      ].join(" ")}
    />
  );
}
