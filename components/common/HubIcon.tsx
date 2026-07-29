/**
 * Club-hub utility art — mission, settings, news, shop.
 */

type HubIconKind = "mission" | "settings" | "news" | "shop";

const SRC: Record<HubIconKind, string> = {
  mission: "/icons/hub-mission.png",
  settings: "/icons/hub-settings.png",
  news: "/icons/hub-news.png",
  shop: "/icons/hub-shop.png",
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
}: {
  kind: HubIconKind;
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
        "shrink-0 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)]",
        className ?? "",
      ].join(" ")}
    />
  );
}
