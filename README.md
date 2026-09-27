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
- History, sisi sidebar, tab aktif, dan cache database warna disimpan via
  penyimpanan userscript supaya bertahan antar reload.
- Database warna utama dimuat dari `public/data/colors.json` di repository
  ini, memakai cache stale-while-revalidate dan 30 warna dasar bawaan sebagai
  fallback saat jaringan tidak tersedia.
- Tab History dan Palette bisa diekspor sebagai CSS custom properties,
  JSON, atau daftar hex polos.
- Preview warna menampilkan rasio kontras WCAG terhadap putih dan hitam.
- Tab Harmony membuat skema complementary, analogous, triadic, dan
  monochromatic dari warna terakhir yang terdeteksi.
- Mode Asset Picker membantu mengambil SVG, gambar, background image,
  sprite, data URI, dan poster video dari halaman sebagai referensi desain.
- Tab Assets memindai halaman, menampilkan galeri aset, dan mengunduh aset
  terpilih atau semua aset secara berurutan.
- Mode Inspect menampilkan properti CSS utama elemen dan menyalin deklarasi
  siap tempel.
- Tab Site Info memindai font terpakai, palet warna, design token `:root`,
  dan sinyal teknologi halaman secara bertahap agar UI tetap responsif.
- Panel tampil sebagai sidebar responsif dan bergeser masuk atau keluar
  saat tombol toggle ditekan.
- Tombol `Left` dan `Right` memindahkan sidebar ke sisi layar yang tidak
  menutupi konten yang sedang diperiksa.
- Tampilan memakai gaya sederhana ala GitHub dengan tombol sedikit
  melengkung dan kartu yang rapi.

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

## Aset Publik

Aset disimpan dengan nama folder huruf kecil dan dapat digunakan langsung
melalui raw URL GitHub setelah perubahan tersedia di branch `main`.

| Path | Isi | Raw URL |
|---|---|---|
| `public/data/colors.json` | Database 745 nama warna | `https://raw.githubusercontent.com/Delta-Polder-Indonesia/Alat_Deteksi/main/public/data/colors.json` |
| `public/assets/images/profile.svg` | Ikon utama userscript | `https://raw.githubusercontent.com/Delta-Polder-Indonesia/Alat_Deteksi/main/public/assets/images/profile.svg` |
| `public/assets/icons/` | Koleksi ikon SVG | Tambahkan nama file setelah path folder, misalnya `search.svg` |

Contoh URL ikon:

```text
https://raw.githubusercontent.com/Delta-Polder-Indonesia/Alat_Deteksi/main/public/assets/icons/search.svg
```

Nama path dan file bersifat case-sensitive. Jangan mengubah nama atau lokasi
aset yang sudah dipublikasikan tanpa memperbarui seluruh URL pemakainya.

## Struktur `src/`

| File | Isi | Kapan diedit |
|---|---|---|
| `meta.js` | Header `==UserScript==` (nama, versi, match, grant) | Naikkan `@version` tiap rilis |
| `01-config.js` | Konstanta dan state global (`COLOR_DATABASE_URL`, flags) | Ganti URL database atau konfigurasi runtime |
| `02-styles.js` | Seluruh CSS (via `GM_addStyle`) | Ubah tema/warna/ukuran panel |
| `03-utilities.js` | Konversi warna (hex/rgb/hsl), pencocokan nama warna, clipboard, notifikasi header | Perbaiki logika warna |
| `05-build-ui.js` | Pembuatan elemen DOM (sidebar, tombol, tooltip) | Ubah struktur/tampilan UI |
| `06-event-listeners.js` | Pemasangan semua event listener | Ubah shortcut/interaksi |
| `07-mouse-detection.js` | Hover highlight + klik untuk deteksi warna | Ubah cara deteksi |
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
