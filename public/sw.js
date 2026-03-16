const CACHE_NAME = 'nature-v6';

// Bu domain'lere gelen istekleri SW ASLA intercept etmez
const BYPASS_HOSTS = [
  'gstatic.com',
  'ytimg.com',
  'yt3.ggpht.com',
  'youtube.com',
  'youtu.be',
  'fonts.gstatic.com',
  'googleapis.com',
  'firebasedatabase.app',
  'firebaseio.com',
  'firebasestorage.googleapis.com',
  'identitytoolkit.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'groq.com',
  'allorigins.win',
  'giphy.com',
  'openrouter.ai',
];

// Bu path'ler her zaman network'ten alınır, cache'lenmez
const NO_CACHE_PATHS = ['/landing', '/landing.html', '/gizlilik', '/gizlilik.html', '/sartlar', '/sartlar.html', '/'];

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Bypass: dış domain'ler — SW hiç müdahale etmez, tarayıcı native fetch kullanır
  if (BYPASS_HOSTS.some(h => url.hostname.includes(h))) return;

  // Bypass: no-cache path'ler
  if (NO_CACHE_PATHS.includes(url.pathname)) {
    e.respondWith(fetch(e.request).catch(() => new Response('Offline', { status: 503 })));
    return;
  }

  // HTML: network-first
  if (e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // JS/CSS/Assets: cache-first (sadece same-origin)
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => caches.match('/index.html'));
      })
    );
    return;
  }

  // Diğer her şey: bypass
  return;
});

self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Nature.co', {
      body: data.body || 'Yeni bildirim',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.url || '/chat',
      vibrate: [100, 50, 100],
      actions: [{ action: 'open', title: 'Aç' }, { action: 'close', title: 'Kapat' }]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;
  e.waitUntil(clients.openWindow(e.notification.data || '/chat'));
});
