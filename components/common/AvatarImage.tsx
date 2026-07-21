import { cn } from "@/lib/utils";
import { getAvatar, isAvatarKey, type AvatarKey } from "@/lib/onboarding/avatars";

type AvatarImageProps = {
  /** Avatar key (Club.avatar / User.managerAvatar). Falls back to the first avatar. */
  avatarKey: string | null | undefined;
  /** Sizing / shape utilities for the rendered image (e.g. "h-20 w-20 rounded-full"). */
  className?: string;
  /** Render as grayscale (locked cosmetics preview). */
  muted?: boolean;
};

/**
 * Renders an illustrated manager avatar from /public/avatars. The source PNGs
 * already carry their own circular background, so callers only supply size +
 * radius via `className`.
 */
export function AvatarImage({ avatarKey, className, muted = false }: AvatarImageProps) {
  const key: AvatarKey = isAvatarKey(avatarKey ?? "")
    ? (avatarKey as AvatarKey)
    : "TACTICAL_COACH";
  const avatar = getAvatar(key);

  return (
    <img
      src={avatar.image}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("object-cover", muted && "grayscale", className)}
    />
  );
}
