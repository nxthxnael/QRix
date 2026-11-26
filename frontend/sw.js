// keeps qrix working offline: the network answers first, so visitors online always get the latest
// files, and the cache answers only when the network cannot

// bump when SHELL changes, so old caches are dropped
const CACHE = "qrix-v1";
const LIBRARY = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

// everything the page needs to run with no connection; tests/sw.test.mjs checks each file exists
const SHELL = [
  "./",
  "./manifest.webmanifest",
  "./css/reset.css",
  "./css/variables.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/main.css",
  "./js/app.js",
  "./js/brands.js",
  "./js/color-picker.js",
  "./js/form-switcher.js",
  "./js/qr-generator.js",
  "./js/qr-style.js",
  "./js/qr-svg.js",
  "./js/theme.js",
  "./js/utils.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  LIBRARY,
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // only the page's own files and the qr library; nothing else is ever stored
  if (request.method !== "GET" || (url.origin !== self.location.origin && request.url !== LIBRARY)) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          // every page address (/, /index.html, ?utm=...) is the same page, kept once, so the cache cannot grow with them
          const key = request.mode === "navigate" ? "./" : request;
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(key, copy)));
        }
        return response;
      })
      // the page itself may be asked for as /, /index.html or with a query; any of them is the shell
      .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? (request.mode === "navigate" ? caches.match("./") : Response.error())))
  );
});
