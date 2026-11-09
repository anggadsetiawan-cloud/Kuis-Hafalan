// Tahap 2: posisi hafalan per baris, titik berhenti di waqaf/akhir ayat, isi ziyadah sampai surat dan ayat, rentang murojaah per shalat.
(function(){
const B=()=>typeof BARIS!=="undefined"?BARIS.p:null,M=()=>typeof MUSHAF!=="undefined"?MUSHAF.p:null;
const tg=()=>{try{return tgGet()}catch(e){return null}};
// Urutan halaman yang akan dihafal (di luar juz awal), sesuai arah hafalan
function urut(t){const P=M(),a=new Set(t.js),r=[];
  for(let i=0;i<604;i++){const p=t.dir=="atas"?i+1:604-i,x=P[p-1];if(!(a.has(x[4])||a.has(x[5])))r.push(p)}return r}
// Baris ke-g (mulai 0) dalam urutan: {p: halaman, i: indeks baris, l: data baris}
function ujung(order,g){const Bp=B();if(g<0)return null;for(const p of order){const n=Bp[p-1].length;if(g<n)return{p,i:g,l:Bp[p-1][g]};g-=n}return null}
const adaDi=(l,s,a)=>l.length==5&&(l[0]<s||(l[0]==s&&l[1]<=a))&&(l[2]>s||(l[2]==s&&l[3]>=a));
// Indeks global baris terakhir yang memuat ayat (s,a); null jika tidak ada di urutan
function lokasiAkhir(order,s,a){const Bp=B();let off=0,r=null;for(const p of order){Bp[p-1].forEach((l,i)=>{if(adaDi(l,s,a))r=off+i});off+=Bp[p-1].length}return r}
const lok=x=>"hal "+x.p+" baris "+(x.i+1),ayt=(l,k)=>nm(l[k])+" ayat "+l[k+1];

function zi(){
  if(mtOff!==0||!B()||!M())return;
  const t=tg();if(!t||!t.js||!t.dir)return;
  const L=mtGet(),d=new Date();d.setHours(0,0,0,0);const c=mtCtx(t,L,d,tgPlan(t));if(c.zn||!(c.zt>0))return;
  const hr=iso(d);let zs=0;for(const k in L)if(k!==hr)zs+=L[k].z||0;
  const order=urut(t),S0=Math.round((t.hl||0)*BAR+zs),ez=c.e.z;
  let pilih=0,ada=false;
  for(const dl of[0,1,2,-1,-2]){const g=S0+c.zt-1+dl;if(g<S0)continue;const x=ujung(order,g);if(x&&x.l.length==5&&x.l[4]>=1){pilih=dl;ada=true;break}}
  const akhir=ujung(order,S0+c.zt-1+(pilih>0?pilih:0)),now=ujung(order,S0+ez);
  const kartu=[...document.querySelectorAll("#app > .card")].find(k=>k.querySelector(".th b")&&k.querySelector(".th b").textContent=="Ziyadah");if(!kartu)return;
  const isi=kartu.querySelector("div:last-child"),dis=!!kartu.querySelector("[data-f=z][disabled]");
  const sasaran=akhir?" → sampai "+(akhir.l.length==5?ayt(akhir.l,2)+" (":"(")+lok(akhir)+")":"";
  const ket=pilih>0?` (+${pilih} baris ke tanda berhenti)`:pilih<0?` · titik berhenti terdekat ${-pilih} baris sebelumnya: ${ayt(ujung(order,S0+c.zt-1+pilih).l,2)}`:"";
  isi.insertAdjacentHTML("afterbegin",`<div class="sm" style="margin-bottom:8px">Posisi hafalan: ${now?lok(now)+(now.l.length==5?" · "+ayt(now.l,0):""):"selesai"}<br>Target: ${c.zt+(pilih>0?pilih:0)} baris${sasaran}${ket}</div>`);
  if(pilih>0){const bt=kartu.querySelector(".go[data-f=z]");if(bt)bt.dataset.v=c.zt+pilih}
  const dt=kartu.querySelector("details[data-d=z]");if(!dt)return;
  dt.insertAdjacentHTML("beforeend",`<div class="sm" style="margin-top:10px">Atau isi sampai ayat</div><div class="row" style="margin-top:6px"><select id="zs" class="sel" style="flex:2;min-width:0;margin:0" ${dis?"disabled":""}>${Array.from({length:114},(_,i)=>`<option value="${i+1}">${i+1}. ${esc(nm(i+1))}</option>`).join("")}</select><input id="za" class="sel" style="flex:1;min-width:0;margin:0" type="number" min="1" inputmode="numeric" placeholder="ayat" ${dis?"disabled":""}><button class="chip" id="zgo" ${dis?"disabled":""}>Isi</button></div>`);
  $("zgo").onclick=()=>{const s=+$("zs").value,a=+$("za").value;if(!a)return toast("Isi nomor ayat");
    const g=lokasiAkhir(order,s,a);if(g===null)return toast("Ayat itu tidak ada di urutan hafalanmu ke depan");
    const dl=g+1-(S0+ez);if(dl<=0)return toast("Ayat itu sudah terlewati");if(ez+dl>900)return toast("Melebihi batas wajar 900 baris per hari");
    const X=mtGet(),e=X[hr]=X[hr]||{m:0,z:0};e.z=(e.z||0)+dl;mtSet(X);if(typeof syncAntri=="function")syncAntri();toast(dl+" baris dicatat");mutabaahHome()};
}
function sh(){
  const q=window.srsAntre?srsAntre():[];if(!q.length)return;
  const gr=Array.from({length:5},(_,i)=>q.slice(Math.floor(i*q.length/5),Math.floor((i+1)*q.length/5)).sort((a,b)=>a-b));
  const rg=a=>{if(!a.length)return"—";const s=[];let i=0;while(i<a.length){let j=i;while(j+1<a.length&&a[j+1]==a[j]+1)j++;s.push(i==j?""+a[i]:a[i]+"–"+a[j]);i=j+1}return"hal "+s.join(", ")};
  document.querySelectorAll("#app details").forEach(dt=>{const sm=dt.querySelector("summary");
    if(sm&&sm.textContent.startsWith("Pembagian per shalat")){sm.textContent="Pembagian per shalat (dari kartu murajaah)";const g=dt.querySelector("div");
      g.innerHTML=["Shubuh","Dzuhur","Ashar","Maghrib","Isya"].map((n,i)=>`<span class="sm">${n}</span><span>${rg(gr[i])}</span>`).join("")}});
}
window.zUji={urut,ujung,lokasiAkhir};
{const m=window.mutabaahHome;window.mutabaahHome=function(){m();try{sh();zi()}catch(e){}}}
if(tab=="mutabaah"&&$("app"))mutabaahHome();
})();
