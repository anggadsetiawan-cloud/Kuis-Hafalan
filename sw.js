// Service worker sederhana: file aplikasi, data halaman mushaf, dan font tetap bisa dibuka tanpa internet.
const C="hafalan-v7";
const AWAL=["./","./index.html","./kebijakan-privasi.html","./syarat-ketentuan.html","./manifest.webmanifest","./icon-192.png","./mushaf.js","./srs.js","./baris.js","./ziyadah.js","./pengingat.js"];
self.addEventListener("install",e=>{
  // Tiap berkas didaftarkan sendiri-sendiri supaya satu berkas yang gagal tidak membatalkan semuanya
  e.waitUntil(caches.open(C).then(c=>Promise.all(AWAL.map(u=>c.add(u).catch(()=>{})))));
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
// Pengingat murojaah: tampilkan notifikasi kiriman server dan buka aplikasi saat diketuk
self.addEventListener("push",e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(x){}
  e.waitUntil(self.registration.showNotification(d.title||"Kuis Hafalan",{body:d.body||"",tag:d.tag||"pengingat",icon:"icon-192.png",badge:"icon-192.png",data:{url:d.url||"./"}}));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const u=(e.notification.data&&e.notification.data.url)||"./";
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(w=>{for(const c of w){if("focus" in c)return c.focus()}return clients.openWindow(u)}));
});
