const CACHE_NAME = "roster-shell-v2";
const SHELL_URLS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Only handle same-origin app-shell assets — API calls go to a different
  // origin (the backend) and must always hit the network, never cached,
  // so check-in state, QR codes, and wallet balances are never stale.
  if (url.origin !== self.location.origin) return;

  // Full page loads: try the network first (fresh app), but always have the
  // cached shell ready so opening the app offline still shows something
  // real instead of the browser's own offline error page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Static assets (JS/CSS/images/fonts): serve from cache instantly if we
  // have it, refresh in the background, network as the fallback.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
