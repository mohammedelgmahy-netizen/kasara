// كسارة الديار — service worker (v1): البرنامج يفتح من غير نت.
// - صفحة البرنامج: من النت الأول (عشان أي تحديث يوصل على طول)، ولو مفيش نت أو النت بطيء تفتح آخر نسخة محفوظة.
// - مكتبات الشكل (Tailwind / الخطوط / الأيقونات / الإكسيل): من الكاش وبتتحدث في الخلفية.
// - Supabase والبيانات: مش بيعدي على الكاش خالص — البيانات بتفضل على الجهاز (localStorage) وبتترفع لما النت يرجع.
const VER = 'kasara-v7'; // أي كاش باسم إصدار أقدم بيتمسح في activate (محمد 2026-11-13: «سيب النسخة الحالية فقط»)
const SHELL = VER + '-shell', LIBS = VER + '-libs';
const SHELL_URLS = []; // مفيش نسخة محفوظة من الصفحة خالص (محمد 2026-11-16)
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

/* محمد 2026-11-16: «مش عاوز أشوف نسخة قديمة خالص، لا بنت ولا من غير نت» → صفحة البرنامج من النت بس، ومفيش نسخة صفحة محفوظة.
   لو مفيش نت: صفحة صغيرة «مفيش نت» بزرار إعادة المحاولة بدل ما يفتح كود قديم. البيانات اللي على الجهاز ما بتتلمسش. */
const OFFLINE_HTML = '<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>كسارة الديار</title></head>'
  + '<body style="margin:0;font-family:Tahoma,Arial,sans-serif;background:#1e3a5f;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center">'
  + '<div style="background:#fff;color:#0f172a;border-radius:16px;padding:28px 22px;max-width:340px;margin:16px"><div style="font-size:44px">📶</div>'
  + '<h2 style="margin:8px 0">مفيش نت دلوقتي</h2><p style="font-size:17px;line-height:1.7">البرنامج بيفتح من النت عشان يجيلك آخر نسخة دايماً.<br>بياناتك محفوظة على الجهاز ومش هتضيع.</p>'
  + '<button onclick="location.reload()" style="background:#059669;color:#fff;border:none;border-radius:10px;padding:12px 26px;font-size:18px;font-weight:bold">جرّب تاني</button></div>'
  + '<script>addEventListener("online",()=>location.reload())<\/script></body></html>';

async function shellFirstNetwork(req, isNav) {
  try {
    return await fetch(new Request(req, { cache: 'no-store' }));
  } catch (err) {
    if (isNav) return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    throw err;
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
