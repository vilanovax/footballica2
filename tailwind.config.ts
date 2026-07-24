import type { Config } from "tailwindcss";

/**
 * Footballica — Fantasy UI tokens mapped to CSS variables.
 * Themes live in app/globals.css (:root = Day Match, [data-theme="dark"] = Night Match).
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",

        surface: {
          DEFAULT: "hsl(var(--surface) / <alpha-value>)",
          foreground: "hsl(var(--surface-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },

        // Additional tokens consumed by shadcn/ui components (scoped to .admin).
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        input: "hsl(var(--input) / <alpha-value>)",

        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          deep: "hsl(var(--primary-deep) / <alpha-value>)",
          // High-contrast green for text on light surfaces (accessibility).
          readable: "hsl(var(--primary-readable) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          deep: "hsl(var(--secondary-deep) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          deep: "hsl(var(--accent-deep) / <alpha-value>)",
        },

        border: "hsl(var(--border) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },

        nav: {
          DEFAULT: "hsl(var(--nav) / <alpha-value>)",
          foreground: "hsl(var(--nav-foreground) / <alpha-value>)",
          active: "hsl(var(--nav-active) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        bubble: "var(--radius-bubble)",
        "bubble-lg": "var(--radius-bubble-lg)",
        "bubble-xl": "var(--radius-bubble-xl)",
      },
      boxShadow: {
        // Hard-offset Fantasy UI shadows
        fantasy: "4px 4px 0px hsl(var(--shadow-ink) / 0.2)",
        "fantasy-lg": "6px 6px 0px hsl(var(--shadow-ink) / 0.22)",
        "fantasy-sm": "2px 2px 0px hsl(var(--shadow-ink) / 0.18)",
        "fantasy-press": "2px 2px 0px hsl(var(--shadow-ink) / 0.2)",

        // Chunky 3D button stacks (theme-aware via CSS vars)
        "btn-3d":
          "0 6px 0 0 hsl(var(--primary-deep)), 4px 4px 0 0 hsl(var(--shadow-ink) / 0.2)",
        "btn-3d-press":
          "0 2px 0 0 hsl(var(--primary-deep)), 2px 2px 0 0 hsl(var(--shadow-ink) / 0.2)",
        "btn-secondary":
          "0 6px 0 0 hsl(var(--secondary-deep)), 4px 4px 0 0 hsl(var(--shadow-ink) / 0.2)",
        "btn-accent":
          "0 6px 0 0 hsl(var(--accent-deep)), 4px 4px 0 0 hsl(var(--shadow-ink) / 0.2)",

        "nav-float":
          "0 -8px 28px hsl(var(--shadow-ink) / 0.12), 4px 4px 0 0 hsl(var(--shadow-ink) / 0.08)",
        glow: "0 0 24px hsl(var(--glow) / 0.45)",
        "glow-accent": "0 0 20px hsl(var(--accent) / 0.5)",
      },
      spacing: {
        // Clears the floating Play FAB + safe-area so list tails aren't clipped.
        nav: "8.75rem",
        "safe-b": "env(safe-area-inset-bottom, 0px)",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      maxWidth: {
        mobile: "28rem",
      },
    },
  },
  plugins: [],
};

export default config;
