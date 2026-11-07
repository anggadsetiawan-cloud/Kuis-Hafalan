// Kartu murajaah per halaman: pengulangan berjarak dengan 7 kotak. Data tersimpan di HP (per profil).
(function(){
const IV=[1,3,7,14,30,60,120],BARIS=15,BARU=5;
const hariIni=()=>iso(new Date()),tambah=(d,n)=>{const x=dparse(d);x.setDate(x.getDate()+n);return iso(x)};
const get=()=>{try{const o=JSON.parse(ls.get("srs:"+who)||"{}")||{};return{a:o.a||[],c:o.c||{}}}catch(e){return{a:[],c:{}}}};
const put=o=>ls.set("srs:"+who,JSON.stringify(o));
const M=()=>typeof MUSHAF!=="undefined"?MUSHAF.p:null;
// Halaman aktif: halaman yang memuat sebagian juz terpilih
const aktif=o=>{const r=[],P=M();if(P)P.forEach((x,i)=>{if(o.a.includes(x[4])||o.a.includes(x[5]))r.push(i+1)});return r};
// Antrean hari ini: semua yang jatuh tempo (paling lama terlambat dulu), lalu halaman baru sesuai sisa jatah harian
const antre=o=>{const t=hariIni(),ak=aktif(o),due=[],baru=[];let hariIniBaru=0;
  ak.forEach(p=>{const c=o.c[p];if(!c)baru.push(p);else{if(c[5]===t)hariIniBaru++;if(c[1]<=t)due.push(p)}});
  due.sort((a,b)=>o.c[a][1].localeCompare(o.c[b][1])||o.c[a][0]-o.c[b][0]);
  return due.concat(baru.slice(0,Math.max(0,BARU-hariIniBaru)))};
// Lancar naik satu kotak, Ragu tetap, Lupa kembali ke kotak 1. Setiap halaman yang dinilai menambah 15 baris murojaah hari ini (sekali per hari).
const nilai=(p,r)=>{const o=get(),t=hariIni(),c=o.c[p],b0=c?c[0]:0;
  const b=r=="lancar"?Math.min(7,b0+1):r=="ragu"?Math.max(1,b0):1,sk={lancar:100,ragu:60,lupa:0}[r],s=c?Math.round((c[3]+sk)/2):sk;
  o.c[p]=[b,tambah(t,IV[b-1]),t,s,(c?c[4]:0)+1,c?c[5]:t];put(o);
  if(!c||c[2]!==t){const X=mtGet(),e=X[t]=X[t]||{m:0,z:0};e.m=Math.min(1500,(e.m||0)+BARIS);mtSet(X);if(typeof syncAntri=="function")syncAntri()}
  return b};
let edit=false,saring="semua",sesi=null;
const rentang=x=>nm(x[0])+" "+x[1]+" – "+(x[0]==x[2]?"":nm(x[2])+" ")+x[3];

function pilih(o){
  const sel=new Set(o.a),A=$("app");
  A.innerHTML=latSeg("kartu")+`<div class="card"><b>Juz yang sudah kamu hafal</b><div class="sm" style="margin-top:4px">Halaman yang memuat sebagian juz terpilih ikut dihitung.</div><div class="chips" id="sj">${Array.from({length:30},(_,i)=>`<button class="chip tg ${sel.has(i+1)?"on":""}" data-j="${i+1}">Juz ${i+1}</button>`).join("")}</div><div class="sm" id="sjn" style="margin-top:10px"></div><button class="go" id="sjs">Simpan</button>${o.a.length?`<button class="go" id="sjb" style="background:var(--c);color:var(--t);border:2px solid var(--bd)">Batal</button>`:""}</div>`;
  const hit=()=>{$("sjn").textContent=aktif({a:[...sel]}).length+" halaman akan dipakai"};hit();
  document.querySelectorAll("[data-j]").forEach(b=>b.onclick=()=>{const j=+b.dataset.j;sel.has(j)?sel.delete(j):sel.add(j);b.classList.toggle("on",sel.has(j));hit()});
  $("sjs").onclick=()=>{if(!sel.size)return toast("Pilih minimal satu juz");const n=get();n.a=[...sel].sort((x,y)=>x-y);put(n);edit=false;srsHome()};
  if($("sjb"))$("sjb").onclick=()=>{edit=false;srsHome()};
}

function srsHome(){
  au.pause();sesi=null;const o=get(),A=$("app");
  if(!M()){A.innerHTML=latSeg("kartu")+`<div class="card">Data halaman belum termuat. Buka sekali dengan internet, lalu coba lagi.</div>`;return}
  if(!o.a.length||edit)return pilih(o);
  const t=hariIni(),ak=aktif(o),q=antre(o),kot=Array(8).fill(0);
  ak.forEach(p=>kot[o.c[p]?o.c[p][0]:0]++);
  const due=ak.filter(p=>o.c[p]&&o.c[p][1]<=t).length;
  const lst=ak.filter(p=>{const c=o.c[p];return saring=="semua"||(saring=="due"?c&&c[1]<=t:saring=="baru"?!c:c&&c[0]>=5)});
  A.innerHTML=latSeg("kartu")+`<div class="card"><b>Kartu murajaah</b><div class="sm" style="margin-top:4px">${ak.length} halaman aktif · ${due} jatuh tempo · ${kot[0]} belum diulang</div>
  <button class="go" id="sm" ${q.length?"":"disabled"}>${q.length?"Mulai ("+q.length+" kartu)":"Tidak ada kartu hari ini"}</button>
  <div class="chips"><button class="chip" id="sa">Atur juz</button></div></div>
  <div class="card"><b>Sebaran kotak</b><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:8px">${[1,2,3,4,5,6,7].map(i=>`<div style="text-align:center"><div class="sm">K${i}</div><b>${kot[i]}</b></div>`).join("")}</div><div class="sm" style="margin-top:8px">Kotak 1 diulang tiap 1 hari, kotak 7 tiap 120 hari. Lancar naik satu kotak, Lupa kembali ke kotak 1.</div></div>
  <div class="card"><b>Daftar halaman</b><div class="chips">${[["semua","Semua"],["due","Jatuh tempo"],["baru","Belum"],["tinggi","Kotak 5–7"]].map(([v,l])=>`<button class="chip ${saring==v?"on":""}" data-sf="${v}">${l}</button>`).join("")}</div>
  <div style="margin-top:8px">${lst.slice(0,60).map(p=>{const x=M()[p-1],c=o.c[p];return`<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--bd)"><span>Hal ${p} · ${esc(nm(x[0]))}</span><span class="sm">${c?"Kotak "+c[0]+" · "+c[3]+"%":"Belum"}</span></div>`}).join("")||`<div class="sm">Tidak ada halaman.</div>`}${lst.length>60?`<div class="sm" style="margin-top:6px">…dan ${lst.length-60} halaman lain</div>`:""}</div></div>`;
  $("sa").onclick=()=>{edit=true;srsHome()};
  if(q.length)$("sm").onclick=()=>{sesi={q,i:0,n:0};kartu()};
  document.querySelectorAll("[data-sf]").forEach(b=>b.onclick=()=>{saring=b.dataset.sf;srsHome()});
}

function kartu(){
  au.pause();const A=$("app");
  if(sesi.i>=sesi.q.length){A.innerHTML=latSeg("kartu")+`<div class="card" style="text-align:center"><h1>Selesai 🎉</h1><div>${sesi.n} halaman diulang. Murojaah hari ini bertambah ${sesi.n*BARIS} baris.</div><button class="go" id="sk">Kembali</button></div>`;$("sk").onclick=srsHome;return}
  const p=sesi.q[sesi.i],x=M()[p-1],c=get().c[p];
  A.innerHTML=`<div class="top"><button class="fin" id="sx">Berhenti</button><span class="sm">${sesi.i+1} dari ${sesi.q.length}</span></div>
  <div class="card"><div class="chips"><span class="chip on">Halaman ${p}</span><span class="chip">Juz ${x[4]}</span><span class="chip">${c?"Kotak "+c[0]:"Baru"}</span></div>
  <div style="margin:16px 0;text-align:center"><div class="sm">Potongan awal halaman</div><div dir="rtl" style="font-family:Amiri,serif;font-size:28px;line-height:2.1;margin-top:8px">${esc(x[6])} …</div></div>
  <div class="chips" style="justify-content:center"><button class="chip" id="sp">🔊 Dengar potongan awal</button></div>
  <div class="sm" style="margin-top:12px;text-align:center">Ingat dan bacakan halaman ini dari awal sampai akhir, lalu periksa dengan mushafmu.</div>
  <div id="sr"><button class="go" id="sc">Periksa hafalan</button></div></div>`;
  $("sx").onclick=srsHome;
  $("sp").onclick=()=>{play(x[0],x[1]);setTimeout(()=>au.pause(),3500)};
  $("sc").onclick=()=>{$("sr").innerHTML=`<div style="text-align:center;margin-top:8px"><b>${esc(rentang(x))}</b></div><div class="sm" style="text-align:center;margin:4px 0 8px">Bagaimana tadi?</div><div class="chips" style="justify-content:center"><button class="chip on" data-n="lancar">Lancar</button><button class="chip" data-n="ragu">Ragu</button><button class="chip" data-n="lupa">Lupa</button></div>`;
    document.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{nilai(p,b.dataset.n);sesi.n++;sesi.i++;kartu()})};
}

function srsHari(){
  const K=document.querySelectorAll("#app > .card");if(K.length<2||!M())return;
  const o=get(),q=o.a.length?antre(o):[];
  const h=o.a.length?`<b>Kartu murajaah</b><div class="sm" style="margin-top:4px">${q.length?q.length+" kartu menunggu hari ini.":"Tidak ada kartu hari ini."}</div><div class="chips"><button class="chip on" id="srsb">${q.length?"Mulai kartu":"Lihat kartu"}</button></div>`
   :`<b>Kartu murajaah</b><div class="sm" style="margin-top:4px">Ulangi halaman dengan jadwal yang pintar. Pilih dulu juz yang sudah kamu hafal.</div><div class="chips"><button class="chip on" id="srsb">Atur kartu</button></div>`;
  K[1].insertAdjacentHTML("afterend",`<div class="card">${h}</div>`);
  $("srsb").onclick=()=>{tab="kartu";navBar();route()};
}
window.srsHome=srsHome;
{const m=window.mutabaahHome;window.mutabaahHome=function(){m();try{srsHari()}catch(e){}}}
window.srsUji={nilai,antre,get,put,aktif};
if(tab=="mutabaah"&&$("app"))mutabaahHome();
})();
