"use client";

import { useEffect, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Lock } from "lucide-react";
import { updateProfile } from "@/actions/updateProfile";
import {
  MANAGER_AVATARS,
  isAvatarUnlocked,
  type AvatarKey,
} from "@/lib/onboarding/avatars";
import {
  CLUB_COLORS,
  DEFAULT_CLUB_COLOR_KEY,
  getClubColor,
  type ClubColorKey,
} from "@/lib/onboarding/clubColors";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";
import { AvatarImage } from "@/components/common/AvatarImage";
import { CLUB_NAME_MAX_LEN } from "@/lib/auth/blacklist";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  GameChip,
  GameCta,
  GamePanel,
} from "@/components/ui/game";
import { cn } from "@/lib/utils";

type ProfileEditModalProps = {
  open: boolean;
  initial: {
    managerName: string;
    clubName: string;
    stadiumName: string;
    avatar: AvatarKey;
    colorKey: ClubColorKey;
  };
  ownedBadgeSlugs: string[];
  onClose: () => void;
  onSaved: () => void;
};

/** Map server error codes → localized copy. */
function errorKey(code: string): string {
  switch (code) {
    case "too_short":
    case "empty":
      return "profile.edit.errShort";
    case "too_long":
      return "profile.edit.errLong";
    case "blacklisted":
      return "onboarding.errBlacklisted";
    case "name_taken":
      return "onboarding.errTaken";
    case "locked_avatar":
    case "invalid_avatar":
      return "profile.edit.errLocked";
    case "invalid_color":
      return "profile.edit.errColor";
    default:
      return "profile.edit.errGeneric";
  }
}

/**
 * Arena edit sheet — live kit preview, name fields, colour + avatar pickers.
 */
export function ProfileEditModal({
  open,
  initial,
  ownedBadgeSlugs,
  onClose,
  onSaved,
}: ProfileEditModalProps) {
  const { t, locale } = useTranslation();
  const owned = new Set(ownedBadgeSlugs);

  const [managerName, setManagerName] = useState(initial.managerName);
  const [clubName, setClubName] = useState(initial.clubName);
  const [stadiumName, setStadiumName] = useState(initial.stadiumName);
  const [avatar, setAvatar] = useState<AvatarKey>(initial.avatar);
  const [colorKey, setColorKey] = useState<ClubColorKey>(
    initial.colorKey ?? DEFAULT_CLUB_COLOR_KEY,
  );
  const [pending, start] = useTransition();

  // Reset draft when reopening so stale edits don't linger.
  useEffect(() => {
    if (!open) return;
    setManagerName(initial.managerName);
    setClubName(initial.clubName);
    setStadiumName(initial.stadiumName);
    setAvatar(initial.avatar);
    setColorKey(initial.colorKey ?? DEFAULT_CLUB_COLOR_KEY);
  }, [
    open,
    initial.managerName,
    initial.clubName,
    initial.stadiumName,
    initial.avatar,
    initial.colorKey,
  ]);

  const clubColor = getClubColor(colorKey);
  const previewClub = clubName.trim() || initial.clubName;
  const previewManager = managerName.trim() || initial.managerName;
  const previewStadium = stadiumName.trim();
  const dirty =
    managerName.trim() !== initial.managerName ||
    clubName.trim() !== initial.clubName ||
    stadiumName.trim() !== (initial.stadiumName ?? "") ||
    avatar !== initial.avatar ||
    colorKey !== (initial.colorKey ?? DEFAULT_CLUB_COLOR_KEY);

  function handleSave() {
    if (pending) return;
    start(async () => {
      const res = await updateProfile({
        managerName: managerName.trim(),
        clubName: clubName.trim(),
        stadiumName: stadiumName.trim(),
        avatar,
        colorKey,
      });
      if (res.ok) {
        haptic(HAPTIC.goal);
        playSound("upgrade");
        toast.success(t("profile.edit.saved"));
        onSaved();
      } else {
        haptic(HAPTIC.miss);
        toast.error(t(errorKey(res.error)));
      }
    });
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      tone="dark"
      title={t("profile.edit.title")}
      subtitle={t("profile.edit.subtitle")}
      closeLabel={t("profile.edit.cancel")}
    >
      {/* Live identity preview */}
      <GamePanel tone="amber" className="mb-4 overflow-hidden p-3.5">
        <div
          aria-hidden
          className="pointer-events-none absolute -end-8 -top-10 h-32 w-32 rounded-full opacity-40 blur-3xl"
          style={{ background: clubColor.hex }}
        />
        <div className="relative flex items-center gap-3">
          <div
            className="relative shrink-0 rounded-full p-0.5"
            style={{
              boxShadow: `0 0 0 3px ${clubColor.hex}, 0 4px 0 0 rgba(0,0,0,0.35)`,
            }}
          >
            <AvatarImage
              avatarKey={avatar}
              colorKey={colorKey}
              className="h-16 w-16 rounded-full"
            />
          </div>
          <div className="min-w-0 flex-1 text-start">
            <p className="truncate font-display text-lg font-black text-white">
              {previewClub}
            </p>
            <p className="truncate font-display text-xs font-bold text-white/65">
              {previewManager}
              {previewStadium ? ` · ${previewStadium}` : ""}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <GameChip tone="amber" className="gap-1.5">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
                  style={{ backgroundColor: clubColor.hex }}
                />
                {locale === "fa" ? clubColor.faName : clubColor.name}
              </GameChip>
            </div>
          </div>
        </div>
      </GamePanel>

      <div className="space-y-3">
        <Field
          label={t("profile.edit.managerName")}
          value={managerName}
          onChange={setManagerName}
        />
        <Field
          label={t("profile.edit.clubName")}
          value={clubName}
          onChange={setClubName}
          maxLength={CLUB_NAME_MAX_LEN}
        />
        <Field
          label={t("profile.edit.stadiumName")}
          value={stadiumName}
          onChange={setStadiumName}
          placeholder={t("profile.edit.stadiumPlaceholder")}
        />
      </div>

      {/* Club colours */}
      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-black text-arena-fg">
            {t("profile.edit.chooseColor")}
          </h3>
          <span className="font-display text-[10px] font-bold text-arena-muted">
            {locale === "fa" ? clubColor.faName : clubColor.name}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {CLUB_COLORS.map((c) => {
            const selected = colorKey === c.key;
            return (
              <motion.button
                key={c.key}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  playSound("click");
                  haptic(HAPTIC.tap);
                  setColorKey(c.key);
                }}
                aria-pressed={selected}
                aria-label={locale === "fa" ? c.faName : c.name}
                className={cn(
                  "relative flex min-h-touch flex-col items-center gap-1.5 rounded-2xl px-1.5 py-2 transition-colors",
                  selected
                    ? "bg-white/10"
                    : "bg-black/25 hover:bg-white/5",
                )}
                style={
                  selected
                    ? {
                        boxShadow: `0 0 0 2px ${c.hex}, 0 3px 0 0 rgba(0,0,0,0.4)`,
                      }
                    : {
                        boxShadow:
                          "0 0 0 1px rgba(255,255,255,0.1), 0 3px 0 0 rgba(0,0,0,0.3)",
                      }
                }
              >
                <span
                  aria-hidden
                  className="h-9 w-9 rounded-full shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),0_2px_0_0_rgba(0,0,0,0.25)]"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="line-clamp-1 text-center font-display text-[10px] font-bold text-white/80">
                  {locale === "fa" ? c.faName : c.name}
                </span>
                {selected ? (
                  <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-arena-success text-white shadow-[0_2px_0_0_rgba(0,0,0,0.35)]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Avatars */}
      <section className="mt-5">
        <h3 className="mb-2 font-display text-sm font-black text-arena-fg">
          {t("profile.edit.chooseAvatar")}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {MANAGER_AVATARS.map((a) => {
            const unlocked = isAvatarUnlocked(a.key, owned);
            const selected = avatar === a.key;
            return (
              <motion.button
                key={a.key}
                type="button"
                disabled={!unlocked}
                whileTap={unlocked ? { scale: 0.95 } : undefined}
                onClick={() => {
                  if (!unlocked) return;
                  playSound("click");
                  haptic(HAPTIC.tap);
                  setAvatar(a.key);
                }}
                aria-pressed={selected}
                aria-label={
                  unlocked
                    ? t(`avatars.${a.key}.name`)
                    : t("profile.edit.locked")
                }
                className={cn(
                  "relative flex min-h-touch flex-col items-center gap-1.5 rounded-2xl px-2 py-2.5",
                  selected
                    ? "bg-white/12"
                    : unlocked
                      ? "bg-black/25"
                      : "bg-black/35 opacity-70",
                )}
                style={
                  selected
                    ? {
                        boxShadow: `0 0 0 2px ${clubColor.hex}, 0 3px 0 0 rgba(0,0,0,0.4)`,
                      }
                    : {
                        boxShadow:
                          "0 0 0 1px rgba(255,255,255,0.1), 0 3px 0 0 rgba(0,0,0,0.3)",
                      }
                }
              >
                <AvatarImage
                  avatarKey={a.key}
                  colorKey={colorKey}
                  muted={!unlocked}
                  className="h-14 w-14 rounded-full"
                />
                <span className="line-clamp-2 text-center font-display text-[11px] font-bold leading-tight text-white/85">
                  {t(`avatars.${a.key}.name`)}
                </span>
                {selected ? (
                  <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-arena-success text-white shadow-[0_2px_0_0_rgba(0,0,0,0.35)]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
                {!unlocked ? (
                  <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.15)]">
                    <Lock className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                ) : null}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <div className="mt-6 flex flex-col gap-2">
        <GameCta
          variant="accent"
          block
          disabled={pending || !dirty}
          onClick={handleSave}
        >
          {pending ? "…" : t("profile.edit.save")}
        </GameCta>
        <GameCta
          variant="ghost"
          block
          disabled={pending}
          onClick={onClose}
          className="min-h-11"
        >
          {t("profile.edit.cancel")}
        </GameCta>
      </div>
    </BottomSheet>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 24,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block text-start">
      <span className="mb-1.5 block font-display text-xs font-bold text-arena-muted">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className="game-input min-h-12 text-base"
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  );
}
