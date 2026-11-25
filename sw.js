// 📲 '2-2😻' 앱 설치용 (오프라인 저장은 안 해요 · 늘 최신 화면을 받아요)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
