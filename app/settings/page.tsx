"use client";

import { useEffect, useState } from "react";

type Theme = "day" | "dark";

function getTheme(): Theme {
  if (typeof document === "undefined") return "day";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "day";
}

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("day");

  useEffect(() => {
    setTheme(getTheme());
  }, []);

  function applyTheme(next: Theme) {
    setTheme(next);
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="pt-2">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
          Settings
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
          Match Atmosphere
        </h1>
      </header>

      <div className="rounded-bubble-xl border border-border bg-surface p-5 shadow-fantasy">
        <p className="font-display text-lg font-bold text-surface-foreground">
          Theme
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Switch between Day Match and Night Match. More options later.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => applyTheme("day")}
            className={[
              "btn-fantasy min-h-touch rounded-bubble border px-3 py-4 font-display text-sm font-bold",
              theme === "day"
                ? "border-primary bg-primary text-primary-foreground shadow-btn-3d"
                : "border-border bg-muted text-muted-foreground shadow-fantasy-sm",
            ].join(" ")}
          >
            Day Match
          </button>
          <button
            type="button"
            onClick={() => applyTheme("dark")}
            className={[
              "btn-fantasy min-h-touch rounded-bubble border px-3 py-4 font-display text-sm font-bold",
              theme === "dark"
                ? "border-primary bg-primary text-primary-foreground shadow-btn-3d"
                : "border-border bg-muted text-muted-foreground shadow-fantasy-sm",
            ].join(" ")}
          >
            Night Match
          </button>
        </div>
      </div>
    </section>
  );
}
