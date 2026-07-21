"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { X, Check, Lock } from "lucide-react";
import { updateProfile } from "@/actions/updateProfile";
import {
  MANAGER_AVATARS,
  isAvatarUnlocked,
  type AvatarKey,
} from "@/lib/onboarding/avatars";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { haptic, HAPTIC } from "@/lib/audio/haptics";
import { playSound } from "@/lib/audio/SoundManager";

type ProfileEditModalProps = {
  initial: {
    managerName: string;
    clubName: string;
    stadiumName: string;
    avatar: AvatarKey;
  };
  ownedBadgeSlugs: string[];
  onClose: () => void;
  onSaved: () => void;
};

/** Map server error codes → localized copy. */
function errorKey(code: string): string {
  switch (code) {
    case "too_short":
      return "profile.edit.errShort";
    case "too_long":
      return "profile.edit.errLong";
    case "locked_avatar":
    case "invalid_avatar":
      return "profile.edit.errLocked";
    default:
      return "profile.edit.errGeneric";
  }
}

export function ProfileEditModal({
  initial,
  ownedBadgeSlugs,
  onClose,
  onSaved,
}: ProfileEditModalProps) {
  const { t } = useTranslation();
  const owned = new Set(ownedBadgeSlugs);

  const [managerName, setManagerName] = useState(initial.managerName);
  const [clubName, setClubName] = useState(initial.clubName);
  const [stadiumName, setStadiumName] = useState(initial.stadiumName);
  const [avatar, setAvatar] = useState<AvatarKey>(initial.avatar);
  const [pending, start] = useTransition();

  function handleSave() {
    start(async () => {
      const res = await updateProfile({
        managerName: managerName.trim(),
        clubName: clubName.trim(),
        stadiumName: stadiumName.trim(),
        avatar,
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
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label={t("profile.edit.cancel")}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 flex max-h-[88vh] w-full max-w-mobile flex-col rounded-t-bubble-lg bg-surface shadow-fantasy-lg sm:rounded-bubble-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <h2 className="font-display text-lg font-bold text-surface-foreground">
            {t("profile.edit.title")}
          </h2>
          <button
            type="button"
            aria-label={t("profile.edit.cancel")}
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-2">
          <Field
            label={t("profile.edit.managerName")}
            value={managerName}
            onChange={setManagerName}
          />
          <Field
            label={t("profile.edit.clubName")}
            value={clubName}
            onChange={setClubName}
          />
          <Field
            label={t("profile.edit.stadiumName")}
            value={stadiumName}
            onChange={setStadiumName}
            placeholder={t("profile.edit.stadiumPlaceholder")}
          />

          <div>
            <p className="mb-2 font-display text-sm font-bold text-surface-foreground">
              {t("profile.edit.chooseAvatar")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MANAGER_AVATARS.map((a) => {
                const unlocked = isAvatarUnlocked(a.key, owned);
                const selected = avatar === a.key;
                return (
                  <button
                    key={a.key}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      haptic(HAPTIC.tap);
                      setAvatar(a.key);
                    }}
                    aria-pressed={selected}
                    className={[
                      "relative flex flex-col items-center gap-1 rounded-bubble border-2 p-2 transition-colors",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted",
                      !unlocked && "opacity-60",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span
                      className={[
                        "text-3xl",
                        unlocked ? "" : "grayscale",
                      ].join(" ")}
                      aria-hidden
                    >
                      {unlocked ? a.emoji : "🔒"}
                    </span>
                    <span className="line-clamp-1 text-center font-display text-[11px] font-bold text-surface-foreground">
                      {t(`avatars.${a.key}.name`)}
                    </span>
                    {selected && (
                      <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fantasy">
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                    {!unlocked && (
                      <span className="absolute -end-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/80 text-background">
                        <Lock className="h-2.5 w-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 p-5 pt-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={pending}
            onClick={handleSave}
            className="btn-fantasy btn-fantasy-primary flex-1 justify-center disabled:opacity-40"
          >
            {pending ? "…" : t("profile.edit.save")}
          </motion.button>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-full px-4 py-3 font-display text-sm font-bold text-muted-foreground"
          >
            {t("profile.edit.cancel")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-sm font-bold text-surface-foreground">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={24}
        placeholder={placeholder}
        className="w-full rounded-bubble border-2 border-border bg-background p-3 font-body text-base text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}
