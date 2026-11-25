// 📲 '2-2😻' 앱 설치용 (오프라인 저장은 안 해요 · 늘 최신 화면을 받아요)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
// 우리 사이트 파일은 매번 새로 확인해요 (예전 화면이 남지 않게)
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).catch(() => fetch(r)));
});
