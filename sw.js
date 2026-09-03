/* מסגרת חיה — מטמון.
 * קליפים לא עוברים כאן: הם נשמרים כ־Blob ב־IndexedDB, כדי לא להסתבך
 * עם בקשות Range של הווידאו בספארי.
 */
const CACHE = 'living-frame-1.0.2';

const SHELL = [
  './',
  './index.html',
  './logo.png',
  './logo-dark.png',
  'https://aframe.io/releases/1.5.0/aframe.min.js',
  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // קליפים ותמונות — ישר לרשת, הטיפול בהם נעשה בקוד האפליקציה
  if (url.pathname.includes('/media/')) return;

  // רשימת הפריטים — תמיד לנסות רשת קודם, כדי שפרסום חדש ייקלט מיד
  if (url.pathname.endsWith('manifest.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // כל השאר (כולל targets.mind?v=) — מטמון קודם
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok && (url.origin === location.origin || url.hostname.includes('jsdelivr') ||
                   url.hostname.includes('aframe.io') || url.hostname.includes('gstatic'))) {
        const c = r.clone();
        caches.open(CACHE).then(x => x.put(e.request, c));
      }
      return r;
    }))
  );
});
