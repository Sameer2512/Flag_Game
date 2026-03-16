/**
 * service-worker.js — Flag Quest
 *
 * Caching strategy:
 *   App shell (HTML/CSS/JS/data)  → Cache-first, network fallback
 *   Flag images (flagcdn.com)     → Cache-first, network fallback, dynamic cache
 *   Google Fonts                  → Network-first, cache fallback
 *   Everything else               → Network-only
 *
 * Bump CACHE_VERSION when you deploy updated app files so users get fresh content.
 */

const CACHE_VERSION   = 'v1';
const SHELL_CACHE     = `flag-quest-shell-${CACHE_VERSION}`;
const FLAGS_CACHE     = `flag-quest-flags-${CACHE_VERSION}`;
const FONTS_CACHE     = `flag-quest-fonts-${CACHE_VERSION}`;

/** All files that make up the app shell — pre-cached on install */
const SHELL_FILES = [
  './index.html',
  './styles/style.css',
  './scripts/csvLoader.js',
  './scripts/speech.js',
  './scripts/game.js',
  './scripts/app.js',
  './data/countries_local.js',
  './data/countries.csv',
  './manifest.json',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
];

/* ── Install: pre-cache the app shell ─────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      // addAll fails if ANY request fails — use individual adds so a missing
      // optional file (e.g. countries.csv when truly offline) doesn't break install.
      return Promise.allSettled(
        SHELL_FILES.map(url =>
          cache.add(url).catch(err =>
            console.warn(`SW: could not pre-cache ${url}:`, err.message)
          )
        )
      );
    })
    .then(() => self.skipWaiting())
  );
});

/* ── Activate: remove stale caches from previous versions ─────────────── */
self.addEventListener('activate', event => {
  const allowedCaches = [SHELL_CACHE, FLAGS_CACHE, FONTS_CACHE];

  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => !allowedCaches.includes(key))
            .map(key => {
              console.info('SW: deleting old cache', key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: route requests to the right strategy ──────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // ── Flag images from flagcdn.com → cache-first (dynamic) ──────────────
  if (url.hostname === 'flagcdn.com') {
    event.respondWith(cacheFirst(request, FLAGS_CACHE));
    return;
  }

  // ── Google Fonts → network-first ──────────────────────────────────────
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(networkFirst(request, FONTS_CACHE));
    return;
  }

  // ── App shell files (same origin) → cache-first ───────────────────────
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // ── Everything else → network only ────────────────────────────────────
  // (Don't interfere with analytics, speech API, etc.)
});

/* ══════════════════════════════════════════════════════════════════════════
   Strategy helpers
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Cache-first: serve from cache immediately; if not cached, fetch from
 * network, cache the response, then return it.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone()); // don't await — fire & forget
    }
    return response;
  } catch (err) {
    // No network and not cached
    console.warn('SW: fetch failed, nothing in cache for', request.url);
    return new Response('Offline — resource not cached yet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

/**
 * Network-first: try the network; if it fails, fall back to cache.
 * Good for resources that change (fonts, etc.).
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await caches.match(request);
    return cached || new Response('Offline — resource not available.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
