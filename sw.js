// Service worker sederhana: file aplikasi dan font tetap bisa dibuka tanpa internet.
const C="hafalan-v3";
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(["./","./index.html","./kebijakan-privasi.html","./manifest.webmanifest","./icon-192.png"])).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener("activate",e=>e.waitUntil(
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&k.startsWith("hafalan-")).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin){
    // Font Google: simpan setelah pertama dimuat, supaya tampilan sama saat offline
    if(u.hostname==="fonts.googleapis.com"||u.hostname==="fonts.gstatic.com"){
      e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(x=>{const cp=x.clone();caches.open(C).then(c=>c.put(e.request,cp));return x})));
    }
    return;
  }
  // Utamakan jaringan supaya pembaruan langsung terlihat; cadangan dari cache saat offline
  e.respondWith(
    fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r})
      .catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html")))
  );
});
