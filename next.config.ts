import type { NextConfig } from "next";

/** Per-deploy SW cache bust — Vercel git SHA (or local fallback). */
const swVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  "v2";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // lucide-react is default-optimized; framer-motion is not — add it explicitly.
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Inlined into the client bundle so ServiceWorkerRegistration can pass ?v=.
  env: {
    NEXT_PUBLIC_SW_VERSION: swVersion,
  },
};

export default nextConfig;
