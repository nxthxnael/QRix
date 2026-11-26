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
      // only qrix's own older caches; another app on the same origin keeps its own
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("qrix-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// the app's own page under any query (/, /index.html, /?utm=...), kept once as "./" so the cache cannot grow with them
const SCOPE = new URL("./", self.location).pathname;
const isAppPage = (url) => url.origin === self.location.origin && (url.pathname === SCOPE || url.pathname === `${SCOPE}index.html`);

// shortcut: guesses at a stalled connection, tune them once real offline use is measured; files wait less
// than the page because modules load one import level at a time, and each level would wait again
const PAGE_WAIT_MS = 3000;
const FILE_WAIT_MS = 1000;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // only the page's own files and the qr library; nothing else is ever stored
  if (request.method !== "GET" || (url.origin !== self.location.origin && request.url !== LIBRARY)) return;

  const key = isAppPage(url) ? "./" : request;
  const fromCache = () => caches.match(key, { ignoreSearch: true });

  let stored = Promise.resolve();
  const network = fetch(request).then((response) => {
    // another page opened on this origin is never stored, so it can never stand in for the app
    if (response.ok && (request.mode !== "navigate" || isAppPage(url))) {
      const copy = response.clone();
      stored = caches.open(CACHE).then((cache) => cache.put(key, copy));
    }
    return response;
  });
  // the network keeps refreshing the cache even after a stalled request was answered from it
  event.waitUntil(network.then(() => stored, () => {}));

  // a network that has not answered in time gives way to the cached copy, when there is one
  const stalled = new Promise((resolve) => setTimeout(resolve, request.mode === "navigate" ? PAGE_WAIT_MS : FILE_WAIT_MS))
    .then(fromCache)
    .then((hit) => hit ?? network);

  event.respondWith(Promise.race([network, stalled]).catch(() => fromCache().then((hit) => hit ?? Response.error())));
});
