const CACHE_NAME = "doug-rosie-gym-tracker-v1";
const APP_SHELL = ["/doug", "/rosie", "/couple", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET" || new URL(request.url).pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached ?? caches.match("/doug"))));
});
