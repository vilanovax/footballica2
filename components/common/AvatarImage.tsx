"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getAvatar, isAvatarKey, type AvatarKey } from "@/lib/onboarding/avatars";
import { getClubColor } from "@/lib/onboarding/clubColors";

type AvatarImageProps = {
  /** Avatar key (Club.avatar / User.managerAvatar). Falls back to the first avatar. */
  avatarKey: string | null | undefined;
  /** Sizing / shape utilities for the wrapper (e.g. "h-20 w-20 rounded-full"). */
  className?: string;
  /** Render as grayscale (locked cosmetics preview). */
  muted?: boolean;
  /** Optional club color key — tints the emoji fallback circle. */
  colorKey?: string | null;
  /** Prefetch for above-the-fold hub / profile heroes. */
  priority?: boolean;
  /** Responsive hint for next/image (default covers hub + profile sizes). */
  sizes?: string;
};

/**
 * Renders an illustrated manager avatar from /public/avatars. The source PNGs
 * already carry their own circular background, so callers only supply size +
 * radius via `className`. On load error, falls back to catalog emoji.
 * Uses next/image so AVIF/WebP derivatives ship instead of raw ~60–90KB PNGs.
 */
export function AvatarImage({
  avatarKey,
  className,
  muted = false,
  colorKey,
  priority = false,
  sizes = "96px",
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
    <span
      aria-hidden
      className={cn(
        "relative inline-block overflow-hidden",
        muted && "grayscale",
        className,
      )}
    >
      <Image
        src={avatar.image}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        draggable={false}
        onError={() => setFailed(true)}
        className="object-cover"
      />
    </span>
  );
}
