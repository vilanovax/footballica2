/*
 * Footballica service worker (hand-rolled, no Workbox).
 *
 * Why not a plugin? `@ducanh2912/next-pwa` is webpack-only and breaks under
 * Next 16's Turbopack-default build. This vanilla SW is fully Turbopack-safe
 * and gives us exactly the caching we need:
 *   - /sounds/*            → cache-first (SFX play instantly, even offline)
 *   - /icons/*, /avatars/* → cache-first (hub chrome)
 *   - fonts (_next media)  → cache-first (no FOUT on repeat visits)
 *   - _next/static/*       → stale-while-revalidate
 *   - navigations          → network-first, fall back to cache
 *
 * VERSION comes from the registration query (?v=commitSha) so each Vercel
 * deploy invalidates old caches without a manual bump.
 */

const SW_URL = new URL(self.location.href);
const VERSION = SW_URL.searchParams.get("v") || "v2";
const SOUND_CACHE = `footballica-sounds-${VERSION}`;
const FONT_CACHE = `footballica-fonts-${VERSION}`;
const STATIC_CACHE = `footballica-static-${VERSION}`;
const PAGE_CACHE = `footballica-pages-${VERSION}`;
const ASSET_CACHE = `footballica-assets-${VERSION}`;

const CURRENT_CACHES = [
  SOUND_CACHE,
  FONT_CACHE,
  STATIC_CACHE,
  PAGE_CACHE,
  ASSET_CACHE,
];

// Precache SFX + hub icons + PWA chrome so first Club/Play visit feels snappy.
const PRECACHE_URLS = [
  "/sounds/goal.mp3",
  "/sounds/miss.mp3",
  "/sounds/whistle.mp3",
  "/sounds/upgrade.mp3",
  "/sounds/click.mp3",
  "/icons/coin.png",
  "/icons/energy.png",
  "/icons/fans.png",
  "/icons/xp.png",
  "/icons/hub-mission.png",
  "/icons/hub-settings.png",
  "/icons/hub-news.png",
  "/icons/hub-shop.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/apple-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(ASSET_CACHE)
      // Individual failures shouldn't abort the whole install.
      .then((cache) =>
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !CURRENT_CACHES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("Network error and no cache available");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Only handle same-origin requests; let the browser deal with the rest.
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/sounds/")) {
    event.respondWith(cacheFirst(request, SOUND_CACHE));
    return;
  }

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/avatars/")
  ) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (
    request.destination === "font" ||
    url.pathname.startsWith("/_next/static/media/")
  ) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }
});
