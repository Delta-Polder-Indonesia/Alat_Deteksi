# SKILL.md — Panduan Kerja untuk Agent

Dokumen ini adalah aturan wajib bagi agent (AI maupun manusia) yang mengerjakan
repository ini. Baca sampai selesai sebelum mengubah kode apa pun.

## 1. Gambaran Proyek

Color Detector Pro adalah userscript Tampermonkey/Greasemonkey untuk deteksi
warna real-time di halaman web. Kode sumber dipecah per bagian di `src/`,
lalu digabung oleh `build.js` menjadi satu file siap pakai di
`dist/ColorDetektor.user.js`.

| Path | Peran |
|---|---|
| `src/meta.js` | Header `==UserScript==` (nama, versi, match, grant) |
| `src/00-header.js` | Pembuka IIFE dan `'use strict'` |
| `src/01-config.js` | Konstanta dan state global |
| `src/02-styles.js` | Seluruh CSS via `GM_addStyle` |
| `src/03-utilities.js` | Konversi warna, pencocokan nama, clipboard, toast |
| `src/04-viewport-clamp.js` | Menjaga panel tetap di dalam layar |
| `src/05-build-ui.js` | Pembuatan elemen DOM panel, tombol, tooltip |
| `src/06-event-listeners.js` | Pemasangan semua event listener |
| `src/07-mouse-detection.js` | Hover highlight dan klik deteksi warna |
| `src/08-drag-panel.js` | Drag panel dengan boundary clamp |
| `src/09-render.js` | Render list database, history, palette |
| `src/10-fetch-colors.js` | Fetch database warna via `GM_xmlhttpRequest` |
| `src/11-init.js` | Inisialisasi |
| `src/99-footer.js` | Penutup IIFE |
| `build.js` | Skrip build, tanpa dependency eksternal |
| `dist/ColorDetektor.user.js` | Hasil build, jangan diedit manual |

Semua file `src/` berbagi satu scope IIFE. Fungsi dan variabel di satu file
dapat dipakai file lain. Urutan penggabungan diatur array `ORDER` di
`build.js` dan tidak boleh diubah tanpa alasan kuat.

## 2. Alur Kerja Wajib

1. Edit hanya file di `src/` (atau `build.js` bila menyangkut proses build).
2. Jalankan `node build.js` setelah setiap perubahan. Build gagal berarti
   pekerjaan belum selesai.
3. Jangan pernah mengedit `dist/ColorDetektor.user.js` secara langsung.
   File tersebut selalu hasil generate.
4. Saat rilis, naikkan `@version` di `src/meta.js` dan `version` di
   `package.json` secara bersamaan, mengikuti semantic versioning.
5. Commit `dist/` bersama perubahan `src/` agar keduanya selalu sinkron.

Verifikasi minimum sebelum menyelesaikan tugas:

```bash
node build.js                       # build harus sukses
node --check dist/ColorDetektor.user.js
```

## 3. Standar Tampilan dan Penulisan

Aturan ini berlaku untuk UI userscript, isi kode, dokumentasi, pesan commit,
dan seluruh isi repository. Tujuannya: hasil kerja terlihat profesional,
bukan keluaran generator.

Dilarang:

- Emoji dan emoticon dalam bentuk apa pun: di UI, string kode, komentar,
  log console, nama userscript, README, pesan commit, dan dokumen lain.
- Karakter dekoratif Unicode sebagai hiasan: box drawing untuk banner
  komentar, bintang, panah dekoratif, dan sejenisnya. Gunakan ASCII biasa.
- Bahasa promosi berlebihan: "amazing", "supercharged", "blazingly fast",
  tanda seru beruntun, huruf kapital semua untuk penekanan.
- Placeholder kosong seperti "lorem ipsum" atau "TODO: fill this" yang
  dibiarkan masuk ke hasil akhir.

Diwajibkan:

- Ikon UI memakai inline SVG atau glyph tipografis netral, bukan emoji.
- Komentar kode singkat, faktual, dan hanya bila menambah pemahaman.
  Header bagian cukup `/* ===== NAMA BAGIAN ===== */`.
- Teks UI berbahasa Inggris yang konsisten dengan teks yang sudah ada;
  dokumentasi repository berbahasa Indonesia.
- Pesan commit ringkas dengan kalimat imperatif, contoh:
  `Perbaiki clamp posisi panel saat resize window`.

## 4. Standar Kualitas Kode

- `'use strict'` selalu aktif; seluruh kode berada dalam IIFE.
- Gunakan `const` secara default, `let` hanya bila nilai berubah,
  jangan pernah `var`.
- Indentasi 4 spasi, string pakai kutip tunggal, akhiri statement dengan
  titik koma, sesuai gaya yang sudah ada. Jangan mereformat kode yang
  tidak disentuh oleh perubahanmu.
- Semua id dan class DOM milik userscript wajib berprefiks `cdp-` agar
  tidak bentrok dengan halaman host.
- Semua state global dideklarasikan di `src/01-config.js`, bukan tersebar
  di file lain.
- Jangan menambah dependency eksternal. Proyek ini sengaja hanya memakai
  Node.js bawaan dan API Greasemonkey (`GM_*`).
- Setiap operasi jaringan dan parsing JSON wajib punya penanganan error
  yang menampilkan keadaan gagal di UI, bukan gagal diam-diam.
- Jangan memakai `eval`, `Function` constructor, atau inline event handler
  (`onclick="..."` dan sejenisnya) di string HTML — inline handler bisa
  gagal pada situs dengan CSP ketat.
- Semua data eksternal (input user, respons API) yang masuk ke `innerHTML`
  atau atribut HTML wajib melewati `escapeHtml()` di `src/03-utilities.js`.
  Gunakan `textContent` bila memungkinkan.
- Style statis ditulis di `src/02-styles.js`, bukan inline di string HTML.
  Inline style hanya untuk nilai dinamis (misalnya warna swatch).
- Perhatikan halaman host: listener global harus dilepas saat tidak
  dipakai, z-index dan style tidak boleh merusak halaman.

### Pelaporan error ke console

- Semua kegagalan runtime wajib dilaporkan lewat `logError(context, err)`
  di `src/03-utilities.js` — satu jalur, berprefiks `LOG_PREFIX`, dengan
  konteks nama fungsi/operasi yang jelas — supaya error langsung terdeteksi
  di console browser.
- Blok `catch` tidak boleh menelan exception diam-diam: minimal panggil
  `logError` dengan object error aslinya sebelum menampilkan keadaan gagal
  di UI.
- Event handler yang terpasang di `document`/`window` (halaman host) wajib
  dibungkus `guard(context, fn)` agar exception tercatat dengan konteks dan
  tidak menjalar mengganggu halaman.
- Inisialisasi dibungkus try/catch dengan `logError('init', err)`; startup
  tidak boleh gagal tanpa jejak.
- `console.error` hanya lewat `logError` untuk kondisi error nyata.
  `console.log`/`console.debug` untuk debugging tidak boleh tertinggal
  di kode final.

### Anti race condition dan robustness

- Setiap `setTimeout`/interval yang mengubah state UI bersama harus
  menyimpan dan membatalkan timer sebelumnya (`clearTimeout`) agar callback
  lama tidak menimpa keadaan baru. Contoh: `showToast()`.
- Setiap operasi async (fetch, callback GM) harus punya `timeout` dan
  handler untuk semua jalur akhir: sukses, error, dan timeout. UI tidak
  boleh menggantung di keadaan loading selamanya.
- Validasi bentuk data eksternal sebelum dipakai (misalnya `Array.isArray`
  pada respons API); jangan berasumsi respons selalu benar.
- Fungsi yang menerima nilai dari luar (hex dari database, dataset DOM)
  wajib menangani nilai tidak valid tanpa melempar exception ke halaman host.
- Satu keadaan hanya boleh diubah lewat satu jalur. Bila dua handler perlu
  perilaku sama (misalnya tombol dan shortcut keyboard), keduanya memanggil
  satu fungsi bersama, bukan menduplikasi logikanya.

### Kebersihan artefak

- Tidak boleh ada file mati di repository: backup manual (`*.old`,
  `*.bak`, `-copy`, monolit lama), kode yang di-comment-out sebagai
  "cadangan", fungsi/variabel/CSS yang tidak pernah dipakai, dan
  `console.log` sisa debugging. Riwayat Git adalah satu-satunya backup.
- Sebelum menyerahkan pekerjaan, periksa sisa artefak:
  fungsi tanpa pemanggil, selector CSS tanpa pemakai, import/require tanpa
  pemakaian, dan file yang tidak lagi dirujuk alur build.
- Hasil generate hanya boleh ada di `dist/`. Jangan menaruh hasil build
  atau file sementara di lokasi lain.

## 5. Ruang Lingkup Perubahan

- Kerjakan hanya yang diminta. Jangan menambahkan fitur, refactor besar,
  atau file baru yang tidak diperlukan tugas.
- Perubahan kecil dan terarah lebih baik daripada penulisan ulang.
- Bila menemukan bug di luar lingkup tugas, laporkan; jangan langsung
  memperbaiki tanpa persetujuan kecuali bug tersebut memblokir tugas.

## 6. Checklist Sebelum Menyerahkan Pekerjaan

- [ ] `node build.js` sukses tanpa error.
- [ ] `dist/ColorDetektor.user.js` ikut ter-update dan lolos `node --check`.
- [ ] Tidak ada emoji atau karakter dekoratif baru di file mana pun.
- [ ] Tidak ada kode mati, file backup, `console.log` debugging, atau
      artefak lain yang tertinggal.
- [ ] Data eksternal yang masuk ke `innerHTML`/atribut sudah di-escape.
- [ ] Operasi async punya penanganan sukses, error, dan timeout.
- [ ] Semua blok catch memanggil `logError`; handler global dibungkus
      `guard`; tidak ada error yang ditelan diam-diam.
- [ ] `@version` dinaikkan bila perubahan akan dirilis.
- [ ] Diff hanya berisi perubahan yang relevan dengan tugas.
- [ ] Dokumentasi (README, SKILL.md) diperbarui bila perilaku berubah.
