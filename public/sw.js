const STATIC_CACHE = "cutiuta-admin-static-v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    ["/auth", "/cont", "/comanda", "/personalizeaza"].includes(url.pathname) ||
    url.pathname.startsWith("/_serverFn")
  )
    return;

  const isStatic =
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/icon-192.png" ||
    url.pathname === "/icon-512.png" ||
    url.pathname === "/manifest.webmanifest";
  if (!isStatic) return;

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const fresh = fetch(request).then(async (response) => {
        if (response.ok && !/private|no-store/i.test(response.headers.get("cache-control") || "")) {
          try {
            await cache.put(request, response.clone());
          } catch {
            /* Cache quota must not break navigation. */
          }
        }
        return response;
      });
      if (cached) event.waitUntil(fresh.catch(() => undefined));
      return cached || fresh;
    }),
  );
});
