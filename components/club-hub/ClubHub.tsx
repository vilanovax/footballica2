"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { upgradeClub } from "@/actions/upgradeClub";
import {
  UPGRADE_LIST,
  getClubLevel,
  getUpgradeCost,
  type ClubSnapshot,
  type UpgradeKey,
} from "@/lib/club/upgrades";
import { StatusBar } from "./StatusBar";
import { StadiumHero } from "./StadiumHero";
import { UpgradeCard } from "./UpgradeCard";

type ClubHubProps = {
  initialClub: ClubSnapshot;
};

export function ClubHub({ initialClub }: ClubHubProps) {
  const [club, setClub] = useState(initialClub);
  const [pendingKey, setPendingKey] = useState<UpgradeKey | null>(null);
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleUpgrade(key: UpgradeKey) {
    if (pendingKey) return;
    setError(null);
    setPendingKey(key);

    startTransition(async () => {
      const result = await upgradeClub(key);
      setPendingKey(null);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setClub(result.club);
      setCelebrateKey((k) => k + 1);
      setCelebrating(true);
      window.setTimeout(() => setCelebrating(false), 1700);

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(40);
      }
    });
  }

  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
            Club Hub
          </p>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Your Stadium
          </h1>
        </div>
      </header>

      <StatusBar
        coins={club.coins}
        fans={club.fans}
        stamina={club.stamina}
        maxStamina={club.maxStamina}
      />

      <StadiumHero
        stadiumLevel={club.stadiumLevel}
        celebrateKey={celebrateKey}
        celebrating={celebrating}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
            Upgrades
          </h2>
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="font-display text-xs font-bold text-destructive"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {UPGRADE_LIST.map((def) => {
          const level = getClubLevel(club, def.key);
          const cost = getUpgradeCost(def.key, level);
          const canAfford = cost !== null && club.coins >= cost;
          return (
            <UpgradeCard
              key={def.key}
              def={def}
              level={level}
              cost={cost}
              canAfford={canAfford}
              pending={pendingKey === def.key}
              onUpgrade={() => handleUpgrade(def.key)}
            />
          );
        })}
      </div>
    </section>
  );
}
