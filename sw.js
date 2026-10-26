// Network-first worker: lets Chrome offer "Install app" and keeps the program opening offline after the first visit.
const C='kasara-v250';
self.addEventListener('install', e=>{ self.skipWaiting(); e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png']).catch(()=>{}))); });
self.addEventListener('activate', e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', e=>{ if(e.request.method!=='GET' || !/^https?:/.test(e.request.url)) return;
  const sameOrigin = new URL(e.request.url).origin===self.location.origin;
  if(!sameOrigin) return;
  e.respondWith(fetch(e.request).then(r=>{ if(r && r.ok){ const cp=r.clone(); caches.open(C).then(c=>c.put(e.request,cp)); } return r; }).catch(()=>caches.match(e.request).then(m=>m||caches.match('./index.html')))); });
