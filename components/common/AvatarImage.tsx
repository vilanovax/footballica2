"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getAvatar, isAvatarKey, type AvatarKey } from "@/lib/onboarding/avatars";
import { getClubColor } from "@/lib/onboarding/clubColors";

type AvatarImageProps = {
  /** Avatar key (Club.avatar / User.managerAvatar). Falls back to the first avatar. */
  avatarKey: string | null | undefined;
  /** Sizing / shape utilities for the rendered image (e.g. "h-20 w-20 rounded-full"). */
  className?: string;
  /** Render as grayscale (locked cosmetics preview). */
  muted?: boolean;
  /** Optional club color key — tints the emoji fallback circle. */
  colorKey?: string | null;
};

/**
 * Renders an illustrated manager avatar from /public/avatars. The source PNGs
 * already carry their own circular background, so callers only supply size +
 * radius via `className`. On load error, falls back to catalog emoji.
 */
export function AvatarImage({
  avatarKey,
  className,
  muted = false,
  colorKey,
}: AvatarImageProps) {
  const key: AvatarKey = isAvatarKey(avatarKey ?? "")
    ? (avatarKey as AvatarKey)
    : "TACTICAL_COACH";
  const avatar = getAvatar(key);
  const [failed, setFailed] = useState(false);
  const accent = getClubColor(colorKey);

  if (failed) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex items-center justify-center rounded-full text-[1.35em] leading-none shadow-fantasy-sm",
          muted && "grayscale opacity-70",
          className,
        )}
        style={{
          background: `linear-gradient(145deg, ${accent.washHex}, ${accent.hex})`,
          color: "#fff",
        }}
      >
        {avatar.emoji}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- catalog PNGs; onError needs native img
    <img
      src={avatar.image}
      alt=""
      aria-hidden
      draggable={false}
      onError={() => setFailed(true)}
      className={cn("object-cover", muted && "grayscale", className)}
    />
  );
}
