// ================================================================
//  EduPlay v4.0 — Service Worker
//  Offline mod, cache stratejisi, push notification altyapısı
// ================================================================

const CACHE_NAME  = 'eduplay-v4';
const DATA_CACHE  = 'eduplay-data-v4';
const CACHE_URLS  = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/ads.js',
  '/data/tests.json',
  '/pages/learn.html',
  '/pages/test.html',
  '/pages/games.html',
  '/pages/leaderboard.html',
  '/pages/profile.html',
  '/pages/settings.html',
  '/pages/about.html',
  '/pages/apk.html',
  '/pages/dashboard.html',
  '/pages/games/math-rush.html',
  '/pages/games/memory-match.html',
  '/pages/games/quiz-blitz.html',
  '/pages/games/word-hunt.html',
  '/pages/games/word-chain.html',
  '/pages/games/sudoku.html',
  '/pages/games/typing-race.html',
  '/pages/games/crossword.html',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
];

// ── Install: Statik dosyaları önbelleğe al ───────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Dosyalar önbelleğe alınıyor...');
      return Promise.allSettled(CACHE_URLS.map(url => cache.add(url).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: Eski cache'leri temizle ───────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== DATA_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache first (statik), Network first (data) ────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase ve reklam isteklerini bypass et
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('ezoic') ||
    url.hostname.includes('adsterra') ||
    url.hostname.includes('infolinks') ||
    url.hostname.includes('googlesyndication') ||
    url.hostname.includes('pagead')
  ) {
    return; // SW müdahale etmesin
  }

  // JSON data: Network önce, yoksa cache
  if (url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(DATA_CACHE).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Diğer her şey: Cache önce, yoksa network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      }).catch(() => {
        // Offline fallback: ana sayfayı göster
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ── Push Notifications (FCM ile) ────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const options = {
    body:    data.body    || 'EduPlay\'den yeni bir bildirim var!',
    icon:    data.icon    || '/assets/icons/icon-192.png',
    badge:   data.badge   || '/assets/icons/icon-72.png',
    tag:     data.tag     || 'eduplay',
    vibrate: [200, 100, 200],
    data:    { url: data.url || '/' },
    actions: [
      { action: 'open',    title: '🎮 Aç',     icon: '/assets/icons/icon-72.png' },
      { action: 'dismiss', title: '✕ Kapat' },
    ]
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'EduPlay', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});

// ── Background Sync (çevrimdışı kayıt gönderimi) ─────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-scores') {
    event.waitUntil(syncScores());
  }
});

async function syncScores() {
  const db = await openIDB();
  const pending = await db.getAll('pending-scores');
  for (const item of pending) {
    try {
      await fetch('/api/scores', { method: 'POST', body: JSON.stringify(item), headers: { 'Content-Type': 'application/json' } });
      await db.delete('pending-scores', item.id);
    } catch (e) { /* tekrar dene */ }
  }
}

// Basit IndexedDB helper
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('eduplay-sync', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('pending-scores', { keyPath: 'id', autoIncrement: true });
    req.onsuccess = e => {
      const db = e.target.result;
      db.getAll = store => new Promise((res, rej) => { const t = db.transaction(store,'readonly').objectStore(store).getAll(); t.onsuccess = () => res(t.result); t.onerror = rej; });
      db.delete = (store, key) => new Promise((res,rej) => { const t = db.transaction(store,'readwrite').objectStore(store).delete(key); t.onsuccess = res; t.onerror = rej; });
      resolve(db);
    };
    req.onerror = reject;
  });
}

console.log('[SW] EduPlay v4 Service Worker aktif ✅');
