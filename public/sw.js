// Service Worker do Fundos: cache offline + Web Push.
// Versão atrelada a build do app — usa __NEXT_BUILD_ID quando disponível,
// senão fallback fixo. O middleware injeta o build id no path se necessário.
const CACHE = "fundos-v3-" + (self.registration?.scope ?? "default").split("/").pop();

const ESTATICOS = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.png",
  "/offline.html",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Assets estáticos: cache-first
  if (url.pathname.startsWith("/_next/static/") || ESTATICOS.includes(url.pathname)) {
    e.respondWith(
      caches.match(req).then((c) => c || fetch(req).then((r) => {
        const copia = r.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copia));
        return r;
      })),
    );
    return;
  }

  // HTML: network-first com fallback offline
  if (req.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(req).catch(() => caches.match("/offline.html") as Promise<Response>),
    );
    return;
  }
});

// === Web Push ===
self.addEventListener("push", (event) => {
  let payload = { titulo: "Fundos", corpo: "Nova notificação", url: "/", tag: "fundos" };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(payload.titulo, {
      body: payload.corpo,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: payload.tag,
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) { w.navigate?.(url); return w.focus(); }
      }
      return self.clients.openWindow(url);
    }),
  );
});
