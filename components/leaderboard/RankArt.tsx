type RankArtKind = "crown" | "gold" | "silver" | "bronze" | "trophy";

const SRC: Record<RankArtKind, string> = {
  crown: "/icons/crown.png",
  gold: "/icons/medal-gold.png",
  silver: "/icons/medal-silver.png",
  bronze: "/icons/medal-bronze.png",
  trophy: "/icons/trophy.png",
};

const SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-9 w-9",
};

/** Crown / podium medals for weekly league UI. */
export function RankArt({
  kind,
  size = "md",
  className,
}: {
  kind: RankArtKind;
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
        "shrink-0 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]",
        className ?? "",
      ].join(" ")}
    />
  );
}

export function medalKindForPlace(place: number): "gold" | "silver" | "bronze" {
  if (place === 1) return "gold";
  if (place === 2) return "silver";
  return "bronze";
}
