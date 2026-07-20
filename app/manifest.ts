import type { MetadataRoute } from "next";

// Web App Manifest — makes Footballica installable with a full-screen,
// portrait-locked, native-like experience. Next serves this at
// /manifest.webmanifest and injects the <link rel="manifest"> automatically.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Footballica",
    short_name: "Footballica",
    description:
      "Take your ruined Division 3 club to the Championship using your football knowledge.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#EAF7E8",
    theme_color: "#0FB34B",
    categories: ["games", "sports", "trivia"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
