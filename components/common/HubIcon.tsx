import Image from "next/image";

/**
 * Club-hub utility art — mission, settings, news, shop.
 * next/image serves AVIF/WebP derivatives of the source PNGs.
 */

type HubIconKind = "mission" | "settings" | "news" | "shop";

const SRC: Record<HubIconKind, string> = {
  mission: "/icons/hub-mission.png",
  settings: "/icons/hub-settings.png",
  news: "/icons/hub-news.png",
  shop: "/icons/hub-shop.png",
};

const PX: Record<"sm" | "md" | "lg", number> = {
  sm: 28,
  md: 36,
  lg: 44,
};

const SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

export function HubIcon({
  kind,
  size = "md",
  className,
  priority = false,
}: {
  kind: HubIconKind;
  size?: "sm" | "md" | "lg";
  className?: string;
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
        "shrink-0 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)]",
        className ?? "",
      ].join(" ")}
    />
  );
}
