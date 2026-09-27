# Alat Deteksi Warna — Color Detector Pro

Userscript Tampermonkey/Greasemonkey untuk deteksi warna real-time di halaman
web mana pun. Kode sumber dipecah per bagian di `src/` supaya mudah
dimodifikasi dan diperbaiki, lalu digabung otomatis menjadi satu file utuh
di `dist/`.

Aturan kerja dan standar kualitas untuk kontributor maupun agent otomatis
ada di [SKILL.md](SKILL.md).

## Fitur Utama

- Mode Pixel memakai EyeDropper API bila tersedia untuk membaca warna piksel
  asli, termasuk pada gambar dan gradient.
- Mode Style tetap tersedia sebagai fallback berbasis computed style.
- History, posisi panel, tab aktif, dan cache database warna disimpan via
  penyimpanan userscript supaya bertahan antar reload.
- Database warna memakai cache stale-while-revalidate dan 30 warna dasar
  bawaan sebagai fallback saat jaringan tidak tersedia.

## Alur Kerja

```bash
# 1. Edit bagian yang mau diubah di folder src/
# 2. Build:
node build.js          # atau: npm run build

# 3. Ambil hasilnya:
#    dist/ColorDetektor.user.js  (file siap install / publish)
```

Mode otomatis (rebuild tiap kali file di `src/` disimpan):

```bash
node build.js --watch  # atau: npm run watch
```

Tidak butuh dependency apa pun — cukup Node.js bawaan.

## Struktur `src/`

| File | Isi | Kapan diedit |
|---|---|---|
| `meta.js` | Header `==UserScript==` (nama, versi, match, grant) | Naikkan `@version` tiap rilis |
| `01-config.js` | Konstanta & state global (`API_URL`, flags) | Ganti endpoint API database warna |
| `02-styles.js` | Seluruh CSS (via `GM_addStyle`) | Ubah tema/warna/ukuran panel |
| `03-utilities.js` | Konversi warna (hex/rgb/hsl), pencocokan nama warna, clipboard, toast | Perbaiki logika warna |
| `04-viewport-clamp.js` | Jaga panel tidak keluar layar | Ubah perilaku posisi panel |
| `05-build-ui.js` | Pembuatan elemen DOM (panel, tombol, tooltip) | Ubah struktur/tampilan UI |
| `06-event-listeners.js` | Pemasangan semua event listener | Ubah shortcut/interaksi |
| `07-mouse-detection.js` | Hover highlight + klik untuk deteksi warna | Ubah cara deteksi |
| `08-drag-panel.js` | Drag panel + boundary clamp | Ubah perilaku drag |
| `09-render.js` | Render list database, history, palette | Tambah/ubah palette & list |
| `10-fetch-colors.js` | Fetch database warna (`GM_xmlhttpRequest`) | Ubah error handling fetch |
| `11-init.js` | Inisialisasi (`buildUI()` + `fetchColors()`) | Ubah urutan start |
| `00-header.js` / `99-footer.js` | Pembuka & penutup IIFE | Jarang disentuh |

## Catatan Penting

- Semua file di `src/` **berbagi satu scope IIFE yang sama** — variabel/fungsi
  di satu file bisa langsung dipakai file lain. Urutan penggabungan diatur di
  array `ORDER` dalam `build.js`; jangan diubah sembarangan.
- Setiap build otomatis divalidasi (`node --check`), jadi syntax error
  langsung ketahuan.
- Saat publish update, jangan lupa naikkan `@version` di `src/meta.js`
  supaya Tampermonkey mendeteksi versi baru.
