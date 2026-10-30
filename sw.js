// Service worker sederhana: file aplikasi tetap bisa dibuka tanpa internet.
const C="hafalan-v1";
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(["./","./index.html"])).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  if(new URL(e.request.url).origin!==location.origin)return;
  // Utamakan jaringan supaya pembaruan langsung terlihat; cadangan dari cache saat offline
  e.respondWith(
    fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r})
      .catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html")))
  );
});
