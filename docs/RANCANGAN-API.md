# Rancangan API Server: Kuis Hafalan

Dokumen ini adalah panduan membangun sisi server saat VPS siap. Aplikasi (`index.html`) sudah memanggil lapisan `Api` yang sekarang berisi **mode contoh** (data di HP). Server cukup menggantikan isi lapisan itu, layar tidak ditulis ulang.

Status keputusan: yang bertanda **[ACC]** sudah disetujui pemilik. Yang bertanda **[TERBUKA]** masih perlu diputuskan.

---

## 1. Prinsip

1. **Offline dulu.** Data tetap tersimpan di HP. Server menyimpan salinan dan menghitung peringkat. Aplikasi harus tetap bisa dipakai tanpa internet.
2. **Server yang menghitung skor dan peringkat.** HP hanya mengirim isian harian, tidak pernah mengirim skor jadi.
3. **Privasi dulu.** Server tidak pernah mengirim email atau data hafalan pengguna lain. Peringkat hanya memuat nama tampilan, skor, dan status.
4. **Satu bentuk kesalahan** untuk semua endpoint (lihat bagian 8).

## 2. Autentikasi **[ACC]**

- Masuk hanya dengan **Google** (Google Identity Services). Tidak ada kata sandi.
- Alur: HP mendapat *ID token* Google, lalu mengirimnya ke server. Server memverifikasi tanda tangan, `aud` (Client ID milik kita), `iss`, dan `exp`, lalu membuat sesi.
- Sesi: token pembawa (bearer) berumur pendek ditambah token penyegar. Simpan hanya `sub` dan email Google sebagai identitas. Email tidak pernah dikirim ke pengguna lain.
- CORS: hanya mengizinkan origin tempat aplikasi di-host.

| Endpoint | Fungsi |
|---|---|
| `POST /auth/google` | Tukar ID token Google dengan sesi. Membuat pengguna baru bila belum ada |
| `POST /auth/refresh` | Perbarui sesi |
| `GET /me` | Profil: nama tampilan, tanggal bergabung, pengaturan |
| `PATCH /me` | Ubah nama tampilan dan `shareGlobal` |
| `DELETE /me` | Hapus akun beserta seluruh datanya |

## 3. Model data

```
users        id, google_sub (unik), email, name, created_at, share_global (bool, default false)
targets      user_id (unik), json (isi target ziyadah: jz, hl, goal, mode, months, speed, start, rest[]), updated_at
daily_logs   user_id, date (YYYY-MM-DD), m (baris murojaah), z (baris ziyadah),
             mt (target murojaah hari itu), zt (target ziyadah hari itu),
             server_ts, device_ts          -- unik (user_id, date)
groups       id, name, code (unik), owner_id, created_at
memberships  group_id, user_id, role (owner|member), share (bool), joined_at   -- unik (group_id, user_id)
invites      id, group_id, kind (code|email), email_hash (opsional), by_user_id,
             status (pending|accepted|declined|expired), created_at, expires_at
blocks       user_id, blocked_user_id
```

Catatan:
- Satuan isian adalah **baris** (1 halaman = 15 baris), sama dengan aplikasi.
- `mt` dan `zt` adalah **potret target hari itu** yang dikirim HP. Alasan: rumus target ada di aplikasi dan bisa berubah. Server tidak menghitung ulang, hanya memeriksa kewajaran.
- Hari **terpenuhi** = (`mt`>0 atau `zt`>0) dan `m`>=`mt` dan `z`>=`zt`.

## 4. Skor dan peringkat **[ACC]**

- **Skor** = jumlah hari terpenuhi dalam 30 hari terakhir (0 sampai 30).
- Urutan seri: skor, lalu **beruntun sekarang**, lalu **total hari terpenuhi** sepanjang waktu.
- **Beruntun** = hari terpenuhi berturut-turut sampai kemarin. Hari ini yang belum selesai tidak memutus. Hari tanpa target (mt=0 dan zt=0) dilewati.
- **Pekan ini** (Halaqah) = hari terpenuhi dalam 7 hari terakhir.
- **Target bersama** Halaqah = jumlah anggota x 5 hari; terpenuhi = jumlah min(5, hari terpenuhi pekan ini) tiap anggota.
- Peringkat global menghitung semua pengguna yang punya isian. Pengguna yang menyembunyikan nama tetap dihitung, tampil sebagai "Peserta tersembunyi".

## 5. Sinkron data

| Endpoint | Fungsi |
|---|---|
| `GET /sync?since=<waktu>` | Ambil target dan isian yang berubah setelah waktu tertentu |
| `PUT /sync/logs` | Kirim isian harian berkelompok. Upsert per (user, date). Menolak tanggal di luar jendela (lihat bagian 7) |
| `PUT /sync/target` | Simpan target |
| `POST /migrate` | Unggah data lokal saat pertama kali login (bagian 9) |

Konflik: **terakhir menulis menang** per tanggal. Waktu otoritatif adalah `server_ts`.

## 6. Peringkat dan Halaqah

Nama metode di tabel adalah fungsi pada `Api` di aplikasi.

| Metode `Api` | Endpoint | Keterangan |
|---|---|---|
| `globalBoard()` | `GET /rank/global` | Kembalikan 10 besar, posisi sendiri, jumlah peserta. Tanpa peringkat di bawah pengguna |
| (baru) | `PUT /me/share` `{global:bool}` | Tampil atau sembunyi di peringkat global |
| `hqList()` | `GET /halaqah` | `{mine, inbox, canCreate:{ok,reasons[]}}` |
| `hqGet(id,mode)` | `GET /halaqah/:id?mode=week\|30` | Detail, anggota terurut, target bersama |
| `hqCreate(nama)` | `POST /halaqah` | Memeriksa syarat (bagian 7). Nama 3 sampai 30 karakter |
| `hqPreview(kode)` | `GET /halaqah/preview?code=` | `{id,name,by,count}`, atau `{already:true,name}`, atau 404 |
| `hqAccept(id)` | `POST /invites/:id/accept` | Dipakai juga untuk gabung lewat kode (server membuat undangan `kind=code` saat preview) |
| `hqDecline(id,block)` | `POST /invites/:id/decline` `{block:bool}` | `block` memasukkan pengundang ke daftar blokir |
| `hqLeave(id)` | `POST /halaqah/:id/leave` | Ketua yang masih punya anggota ditolak. Ketua sendirian: Halaqah dihapus |
| `hqKick(id,mid)` | `DELETE /halaqah/:id/members/:mid` | Hanya ketua |
| `hqTransfer(id,mid)` | `POST /halaqah/:id/transfer` `{memberId}` | Hanya ketua |
| `hqNewCode(id)` | `POST /halaqah/:id/code` | Hanya ketua. Kode lama tidak berlaku lagi |
| `hqShare(id,v)` | `PUT /halaqah/:id/share` `{share:bool}` | Tampil atau sembunyi di Halaqah itu |
| (baru) | `POST /halaqah/:id/invite-email` `{email}` | Hanya ketua. Jawaban selalu sama (tidak membocorkan apakah email terdaftar) |

Aturan undangan **[ACC]**:
- Undangan utama lewat **kode atau tautan** (`?halaqah=KODE`), dibagikan lewat WhatsApp. Kode 6 karakter dari huruf dan angka yang tidak membingungkan (tanpa 0, O, 1, I).
- Penerima selalu melihat pratinjau dulu, lalu memilih Terima atau Tolak.
- Undangan email: disimpan sebagai `pending` dan muncul di kotak masuk saat pemilik email login. Server tidak mengirim email di tahap awal **[TERBUKA: layanan email]**.
- Undangan kedaluwarsa dalam 7 hari. Penolak bisa memblokir pengundang. Pengundang yang diblokir tidak bisa mengundang lagi dan tidak mendapat tahu.
- Akun anak: undangan hanya lewat kode yang diberikan orang tua atau ustaz **[TERBUKA: cara menandai akun anak]**.

## 7. Batas dan aturan **[ACC]**

| Aturan | Nilai |
|---|---|
| Syarat membuat Halaqah | Beruntun >= 7 hari **dan** akun berumur >= 7 hari |
| Halaqah yang dimiliki | maksimal 3 |
| Halaqah yang diikuti (termasuk yang dimiliki) | maksimal 5 |
| Anggota per Halaqah | maksimal 30 |
| Undangan tertunda per Halaqah | maksimal 20 |
| Pengisian susulan | hari ini dan 2 hari ke belakang. Tanggal lain ditolak |
| Batas wajar isian per hari | murojaah maksimal 5 juz (1.500 baris), ziyadah maksimal 3 juz (900 baris) **[TERBUKA: angka akhir]** |
| Laju permintaan | batasi per pengguna dan per IP; undangan: maksimal 20 per jam |

Waktu isian dicatat **server** (`server_ts`), bukan jam HP.

## 8. Format kesalahan

Semua kesalahan: `HTTP 4xx/5xx` dengan badan `{"error":{"code":"...","message":"..."}}`. Aplikasi menampilkan `message` apa adanya, jadi tulis dalam bahasa Indonesia yang ramah.

| code | Arti | message (contoh) |
|---|---|---|
| `syarat_belum_terpenuhi` | Syarat buat Halaqah | Syarat membuat Halaqah belum terpenuhi. |
| `batas_halaqah` | Sudah 5 Halaqah diikuti | Batas Halaqah yang diikuti sudah 5. |
| `batas_dimiliki` | Sudah 3 Halaqah dimiliki | Kamu sudah memiliki 3 Halaqah. |
| `halaqah_penuh` | 30 anggota | Halaqah ini sudah penuh. |
| `serahkan_dulu` | Ketua keluar tapi masih ada anggota | Serahkan kepemimpinan dulu sebelum keluar. |
| `undangan_tidak_berlaku` | Kedaluwarsa atau sudah diproses | Undangan sudah tidak berlaku. |
| `tidak_ditemukan` | Halaqah atau kode tidak ada | Halaqah tidak ditemukan. |
| `tidak_diizinkan` | Bukan ketua | Hanya ketua yang bisa melakukan ini. |
| `tanggal_tidak_valid` | Di luar jendela susulan | Isian hanya bisa diubah untuk hari ini dan 2 hari ke belakang. |
| `terlalu_banyak` | Kena batas laju | Terlalu banyak permintaan, coba lagi sebentar. |

## 9. Migrasi data dari HP **[ACC]**

Saat pengguna pertama kali login:
1. Aplikasi menampilkan "Hubungkan data di HP ini ke akun?" dengan ringkasan (nama, target, jumlah hari isian).
2. `POST /migrate` mengirim `{nama, target, logs:[{date,m,z,mt,zt}], pengaturan}`.
3. Server memasukkan data secara **idempoten** (boleh diulang). Isian di luar jendela susulan tetap diterima **sekali ini saja** sebagai riwayat awal, tapi ditandai `imported` dan tidak dihitung untuk syarat "beruntun 7 hari" membuat Halaqah selama 7 hari pertama.
4. Data lokal tidak dihapus; menjadi *cache*.

Catatan: karena riwayat impor tidak mencerminkan isian yang divalidasi server, syarat akun >= 7 hari tetap berlaku.

## 10. Anti-kecurangan

- Isian dicatat sendiri oleh pengguna, jadi streak mudah dipalsukan. Pengaman: waktu dari server, jendela susulan 2 hari, batas wajar per hari, syarat umur akun, dan batas laju.
- Peringkat berbasis **konsistensi** lebih sulit dibesar-besarkan daripada jumlah halaman.
- Pengguna yang melaporkan data tidak wajar: sediakan tombol lapor, dan kolom `flagged` pada `users` untuk dikeluarkan dari peringkat secara manual.

## 11. Keamanan dan privasi

- Semua endpoint (kecuali `/auth/*`) butuh sesi. Semua masukan divalidasi (panjang, tipe, rentang).
- Server menyamarkan anggota yang menyembunyikan nama **di server**, bukan di aplikasi.
- Nama Halaqah disaring kata kasar dan panjang dibatasi.
- Hapus akun harus menghapus isian, keanggotaan, dan undangan. Jika ketua dihapus: serahkan ke anggota tertua atau hapus Halaqah bila kosong.
- Catat log akses dan kesalahan, tanpa menyimpan isi hafalan.

## 12. Performa

Skala awal kecil: hitung peringkat **sesuai permintaan** dengan indeks pada `daily_logs(user_id, date)`. Bila lambat, simpan hasil per 5 menit di tabel `rank_cache`.

## 13. Pilihan teknologi **[TERBUKA]**

Saran ringan untuk VPS kecil: Node.js (Fastify) + SQLite mode WAL, atau PHP (Laravel) + MySQL jika lebih nyaman. Di depannya Nginx dengan HTTPS. Yang dibutuhkan dari kamu: **domain atau subdomain**, **Google Client ID**, dan keputusan stack.

## 14. Urutan pengerjaan server

1. Kerangka, HTTPS, login Google, `/me`.
2. `/sync` dan `/migrate` (data HP tersimpan di akun).
3. Peringkat global dan `PUT /me/share`.
4. Halaqah: buat, kode, preview, terima, tolak.
5. Halaqah: ketua (kick, transfer, kode baru), batas dan syarat.
6. Undangan email, laporan, hapus akun.
7. Ganti isi lapisan `Api` di aplikasi dari mode contoh ke server, uji berdua.
