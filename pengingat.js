// Pengingat murojaah lewat notifikasi (Web Push). Pengaturan di Pengaturan; pengirimannya dari server sesuai jam yang dipilih.
(function(){
const HARI=[[1,"Sen"],[2,"Sel"],[3,"Rab"],[4,"Kam"],[5,"Jum"],[6,"Sab"],[7,"Min"]];
const b64=s=>{const r=atob((s+"=".repeat((4-s.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(r,c=>c.charCodeAt(0))};
const mampu=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
const ios=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)&&!(navigator.standalone||(window.matchMedia&&matchMedia("(display-mode: standalone)").matches));
let S=null,K="",N=0;
function badan(){
  const t='<b>Pengingat murojaah</b>';
  if(!(SERVER&&glGet(who)))return t+'<div class="sm" style="margin-top:6px">Masuk dengan Google untuk memakai pengingat.</div>';
  if(!mampu())return t+'<div class="sm" style="margin-top:6px">Peramban ini belum mendukung notifikasi.</div>';
  if(ios())return t+'<div class="sm" style="margin-top:6px">Di iPhone, pasang aplikasi ke layar utama dulu (Bagikan, lalu Tambahkan ke Layar Utama), lalu buka dari sana.</div>';
  if(Notification.permission==="denied")return t+'<div class="sm" style="margin-top:6px">Notifikasi diblokir di pengaturan peramban. Izinkan dulu, lalu muat ulang halaman ini.</div>';
  return t+`<div class="sm" style="margin:6px 0 10px">Notifikasi dikirim server sesuai jam yang kamu pilih, walau aplikasi sedang tertutup.</div>
  <div class="chips"><button class="chip tg ${S.enabled?"on":""}" id="pgon">Aktifkan pengingat</button></div>
  <div class="sm" style="margin-top:10px">Hari</div><div class="chips">${HARI.map(([n,l])=>`<button class="chip tg ${S.days.includes(n)?"on":""}" data-pgh="${n}">${l}</button>`).join("")}</div>
  <div class="sm" style="margin-top:10px">Jam</div>${S.times.map((j,i)=>`<div class="row" style="margin-top:6px"><input class="sel" type="time" data-pgt="${i}" value="${j}" style="margin:0"><button class="chip" data-pgx="${i}">Hapus</button></div>`).join("")}
  ${S.times.length<6?'<div class="chips"><button class="chip" id="pgtb">+ Tambah jam</button></div>':""}
  <div class="sm" style="margin-top:10px">Judul notifikasi</div><input class="sel" id="pgj" maxlength="60" value="${esc(S.title)}" style="margin-top:4px">
  <button class="go" id="pgs">Simpan</button>
  <div class="chips"><button class="chip" id="pgu">Kirim notifikasi uji</button></div>
  <div class="sm" style="margin-top:8px">Perangkat terdaftar: ${N}</div>`;
}
function gambar(){const k=document.getElementById("pgk");if(!k)return;k.innerHTML=badan();ikat()}
async function simpan(){
  const j=$("pgj");if(j)S.title=j.value.trim()||"Waktunya murojaah!";
  if(!S.days.length)return toast("Pilih minimal satu hari");
  if(!S.times.length)return toast("Tambahkan minimal satu jam");
  try{
    const reg=await (async()=>{if(S.enabled&&Notification.permission!=="granted"){const p=await Notification.requestPermission();if(p!=="granted")throw new Error("Izin notifikasi tidak diberikan")}return navigator.serviceWorker.ready})();
    let sub=await reg.pushManager.getSubscription();
    if(S.enabled){if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(K)});const x=sub.toJSON();await api("/push/subscribe",{method:"POST",body:{endpoint:x.endpoint,keys:x.keys}})}
    else if(sub){try{await api("/push/subscribe",{method:"DELETE",body:{endpoint:sub.endpoint}})}catch(e){}await sub.unsubscribe()}
    const r=await api("/push/settings",{method:"PUT",body:{enabled:S.enabled,days:S.days,times:S.times,title:S.title,tz:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Jakarta"}});
    S=r.settings;const st=await api("/push");N=st.perangkat;toast("Pengingat disimpan");gambar();
  }catch(e){toast(e.message||"Gagal menyimpan pengingat")}
}
function ikat(){
  const g=id=>document.getElementById(id);if(!g("pgs"))return;
  g("pgon").onclick=()=>{S.enabled=!S.enabled;gambar()};
  document.querySelectorAll("[data-pgh]").forEach(b=>b.onclick=()=>{const n=+b.dataset.pgh,i=S.days.indexOf(n);i<0?S.days.push(n):S.days.splice(i,1);S.days.sort();gambar()});
  document.querySelectorAll("[data-pgt]").forEach(b=>b.onchange=()=>{S.times[+b.dataset.pgt]=b.value||S.times[+b.dataset.pgt]});
  document.querySelectorAll("[data-pgx]").forEach(b=>b.onclick=()=>{S.times.splice(+b.dataset.pgx,1);gambar()});
  if(g("pgtb"))g("pgtb").onclick=()=>{S.times.push("12:00");gambar()};
  g("pgs").onclick=simpan;
  g("pgu").onclick=async()=>{try{const r=await api("/push/test",{method:"POST"});toast(r.ok?"Notifikasi uji terkirim ke "+r.terkirim+" perangkat":"Pengiriman gagal, coba aktifkan ulang pengingat")}catch(e){toast(e.message||"Gagal mengirim uji")}};
}
async function render(){
  const app=$("app");if(!app||tab!=="pengaturan")return;
  const kartu=[...app.querySelectorAll(".card")].find(c=>c.querySelector("b")&&c.querySelector("b").textContent=="Pemakaian offline");
  const html='<div class="card" id="pgk"></div>';
  if(kartu)kartu.insertAdjacentHTML("afterend",html);else app.insertAdjacentHTML("beforeend",html);
  if(SERVER&&glGet(who)&&mampu()){try{const st=await api("/push");S=st.settings;K=st.publicKey;N=st.perangkat}catch(e){document.getElementById("pgk").innerHTML="<b>Pengingat murojaah</b><div class=\"sm\">Belum bisa memuat pengaturan. Periksa koneksi.</div>";return}}
  gambar();
}
window.pgUji={b64};
{const m=window.pengaturanHome;window.pengaturanHome=function(){m();try{render()}catch(e){}}}
})();
