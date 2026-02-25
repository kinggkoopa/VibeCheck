/**
 * MetaVibeCoder Service Worker — PWA support.
 *
 * Handles:
 * - Cache-first for truly static assets (images, fonts, icons)
 * - Network-first for Next.js routes (/_next/)
 * - Network-only for API routes
 * - Offline fallback for navigation requests
 * - Push notification display
 */

const CACHE_NAME = "metavibe-v2";
// Only pre-cache truly static assets — NOT server-rendered pages
const STATIC_ASSETS = ["/manifest.json"];

// Install — pre-cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // API routes — network only (don't cache dynamic data)
  if (url.pathname.startsWith("/api/")) return;

  // Next.js internal routes — network first with cache fallback
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache _next/static assets (immutable hashed bundles)
          if (response.ok && url.pathname.startsWith("/_next/static/")) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || new Response("Offline", { status: 503 })))
    );
    return;
  }

  // Static assets (images, manifests, icons) — cache first, fallback to network
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|avif|woff2?|json)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML navigation requests — network first, offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          "<html><body style='font-family:system-ui;text-align:center;padding:4rem'>" +
            "<h1>You are offline</h1>" +
            "<p>MetaVibeCoder requires an internet connection. Please reconnect and try again.</p>" +
            "</body></html>",
          { headers: { "Content-Type": "text/html" }, status: 503 }
        )
      )
    );
  }
});

// Push notifications — wrapped in try/catch for safety
self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data?.json();
  } catch {
    data = null;
  }

  if (!data) {
    data = {
      title: "MetaVibeCoder",
      body: "Task completed!",
    };
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag ?? "metavibe-notification",
      data: { url: data.url ?? "/dashboard" },
    })
  );
});

// Notification click — open the relevant page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
