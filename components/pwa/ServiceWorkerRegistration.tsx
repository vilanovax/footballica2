"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker (production only). Kept out of dev so
 * Turbopack HMR is never intercepted by cached responses. Mounted once in the
 * root layout; renders nothing.
 *
 * Passes the Vercel git SHA (or a stable fallback) as `?v=` so each deploy
 * installs a fresh SW and drops stale cache buckets (see public/sw.js).
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Stamped at build time from VERCEL_GIT_COMMIT_SHA (see next.config.ts).
    const buildId = process.env.NEXT_PUBLIC_SW_VERSION || "v2";

    const register = () => {
      navigator.serviceWorker
        .register(`/sw.js?v=${encodeURIComponent(buildId)}`, {
          // Always revalidate the SW script so deploys pick up the new ?v=.
          updateViaCache: "none",
        })
        .catch(() => {
          /* registration failed — app still works, just no offline cache */
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
