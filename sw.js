/* 60초 리셋 — service worker (오프라인 캐시)
   bump CACHE 버전을 올리면 새 버전이 배포됨 */
const CACHE = "reset60-v19";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./fonts/playfair-500.woff2",
  "./fonts/playfair-600.woff2",
  "./fonts/playfair-700.woff2",
  "./fonts/playfair-italic-500.woff2",
  "./assets/bg-b.png",
  "./assets/orb.png",
  // bg.mp4(약 6MB)는 일부러 프리캐시에서 제외 — 첫 설치 부담을 줄이고 fetch 핸들러가 런타임 캐시
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const isDoc = req.mode === "navigate" || req.destination === "document";
  if (isDoc) {
    // HTML: 네트워크 우선(항상 최신 반영) → 실패 시 캐시(오프라인)
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => { try { c.put(req, copy); } catch (_) {} });
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }
  // 그 외(에셋·폰트): 캐시 우선(오프라인 동작 + 런타임 캐시)
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => { try { c.put(req, copy); } catch (_) {} });
          return res;
        })
        .catch(() => cached);
    })
  );
});
