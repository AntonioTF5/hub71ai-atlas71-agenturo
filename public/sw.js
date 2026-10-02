// Atlas71 service worker: makes the app installable and keeps the shell available offline.
// Pages are network-first (so a new deploy is picked up at once), hashed build assets are
// cache-first, and the agent API is never touched: every answer must come from the live server.
const VERSION = "atlas71-v1";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const PRECACHE = ["/", "/manifest.webmanifest", "/brand/atlas71-mark.png", "/brand/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Atlas71 · offline</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#F6F5F1;color:#101828;font:16px/1.5 system-ui,sans-serif;padding:24px;text-align:center}img{width:72px;height:72px}p{color:#5D6675;max-width:28ch}</style></head><body><main><img src="/brand/atlas71-mark.png" alt=""><h1>You're offline</h1><p>Atlas71 needs a connection to talk to its agent. Your case is saved on this device.</p></main></body></html>`;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put("/", copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() =>
          caches
            .match("/")
            .then((hit) => hit || new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
        ),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(ASSETS).then((c) => c.put(req, copy)).catch(() => undefined);
            }
            return res;
          }),
      ),
    );
  }
});
