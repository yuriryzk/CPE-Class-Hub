// Class Hub service worker: daily-summary notifications, and the last-seen Schedule page for offline use.
// Registered as /sw.js?dev=1 by `npm run dev`, which turns caching off so development never serves stale code.
const CACHE = "classhub-v1";
const DEV = new URL(self.location.href).searchParams.has("dev");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })()),
);

self.addEventListener("fetch", (e) => {
  if (DEV || e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  // Build files have a content hash in their name, so a cached copy is always right.
  // shortcut: old builds' files stay cached after each deploy (a few hundred KB each); bump CACHE if it ever matters.
  if (url.pathname.startsWith("/_next/static/")) e.respondWith(cacheFirst(e.request));
  // The Schedule page: always fresh when online; the last one seen when offline.
  else if (e.request.mode === "navigate" && url.pathname === "/") e.respondWith(scheduleOrSaved(e.request));
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}

async function scheduleOrSaved(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(CACHE)).put("/", res.clone());
    return res;
  } catch {
    return (await caches.match("/")) ?? Response.error();
  }
}

self.addEventListener("push", (e) => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(d.title || "Class Hub", {
      body: d.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: "daily-summary", // tonight's summary replaces last night's
      data: { url: d.url || "/" },
    }),
  );
});

// Opens what the summary is about: an open Class Hub window goes there, otherwise a new one opens.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/", self.location.origin).href;
  e.waitUntil((async () => {
    for (const c of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) {
      try {
        await c.focus();
        return await c.navigate(url);
      } catch {} // not controlled by this worker; fall through to a new window
    }
    return self.clients.openWindow(url);
  })());
});
