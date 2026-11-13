// كسارة الديار — service worker (260.4): البرنامج يفتح من غير نت.
// - صفحة البرنامج: من النت الأول (عشان أي تحديث يوصل على طول)، ولو مفيش نت أو النت بطيء تفتح آخر نسخة محفوظة.
// - مكتبات الشكل (Tailwind / الخطوط / الأيقونات / الإكسيل): من الكاش وبتتحدث في الخلفية.
// - Supabase والبيانات: مش بيعدي على الكاش خالص — البيانات بتفضل على الجهاز (localStorage) وبتترفع لما النت يرجع.
const VER = 'kasara-260.4';
const SHELL = VER + '-shell', LIBS = VER + '-libs';
const SHELL_URLS = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];
const LIB_URLS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];
const LIB_HOSTS = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const s = await caches.open(SHELL);
    await Promise.all(SHELL_URLS.map(u => fetch(u, { cache: 'no-store' }).then(r => r.ok && s.put(u, r)).catch(() => {})));
    const l = await caches.open(LIBS);
    await Promise.all(LIB_URLS.map(u => fetch(u, { mode: 'no-cors' }).then(r => l.put(u, r)).catch(() => {})));
  })());
});

self.addEventListener('activate', e => e.waitUntil((async () => {
  const keep = [SHELL, LIBS];
  const ks = await caches.keys();
  await Promise.all(ks.filter(k => !keep.includes(k)).map(k => caches.delete(k)));
  await self.clients.claim();
})()));

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

async function shellFirstNetwork(req, isNav) {
  const cache = await caches.open(SHELL);
  const key = isNav ? 'index.html' : req;
  const net = fetch(new Request(req, { cache: 'no-store' })).then(r => {
    if (r && r.ok) cache.put(key, r.clone()).catch(() => {});
    return r;
  });
  try {
    // لو النت ضعيف أوي (أكتر من 8 ثواني) افتح النسخة المحفوظة
    return await Promise.race([net, timeout(8000)]);
  } catch (err) {
    const hit = (await cache.match(key, { ignoreSearch: true })) || (isNav && await cache.match('./'));
    if (hit) return hit;
    return net; // مفيش نسخة محفوظة لسه: استنى النت
  }
}

async function libCache(req) {
  const cache = await caches.open(LIBS);
  const hit = await cache.match(req, { ignoreVary: true });
  const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()).catch(() => {}); return r; });
  if (hit) { net.catch(() => {}); return hit; }
  return net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(shellFirstNetwork(req, req.mode === 'navigate'));
  } else if (LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(libCache(req));
  }
  // أي حاجة تانية (Supabase وغيره) بتروح للنت مباشرة من غير كاش
});
