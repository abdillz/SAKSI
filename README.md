# SAKSI: Prototipe Aplikasi

Prototipe **SAKSI (Sistem Aplikasi Kendali Saji Integratif)**, aplikasi pemantau waktu dan suhu makanan Makan Bergizi Gratis (MBG). Aplikasi membaca warna label indikator waktu-suhu berbasis antosianin kulit manggis lewat kamera ponsel, mencatat enam titik kritis dari dapur sampai kelas, lalu memutuskan apakah makanan masih layak dibagikan.

Dibuat untuk Lomba Esai HIMATETA Universitas Riau 2026 oleh Muhammad Abdillah (Universitas Brawijaya).

## Isi aplikasi

| Mode | Pengguna | Fungsi |
|---|---|---|
| Dapur | Petugas SPPG, sopir | Membuat batch, mencatat terima bahan (suhu, uji cepat), suhu inti saat matang, mengaktifkan label, berangkat, dan tiba. Menampilkan QR batch dan kartu label. |
| Guru | Guru di sekolah | Memindai QR batch, membaca warna label dengan kamera (dikoreksi terhadap putih kartu), lalu memutuskan *bagikan*, *segera bagikan*, atau *tahan*. |
| Pengawas | BGN, dinas kesehatan | Skor risiko tiap SPPG (bobot sesuai Lampiran 5 esai), peringatan terbaru, dan grafik rata-rata jeda matang sampai saji. |

Keputusan gerbang saji memakai dua bukti sekaligus:

- **Tahan** jika label kuning terang **atau** jeda sejak matang lebih dari 4 jam (batas BGN).
- **Segera bagikan** jika label cokelat kekuningan **atau** jeda lebih dari 2 jam (batas WHO).
- **Bagikan** jika label masih cokelat dan jeda kurang dari 2 jam.

## Cara menjalankan

**Paling cepat (laptop):** ekstrak zip, lalu buka `index.html` dengan Chrome atau Edge. Tidak perlu instalasi.

**Agar kamera bisa dipakai di HP:** kamera hanya bisa dibuka lewat alamat `https://`, jadi unggah ke Vercel:

1. Buka https://vercel.com/new dan masuk.
2. Pilih opsi unggah folder (atau hubungkan repositori GitHub berisi folder ini).
3. Tanpa pengaturan build apa pun, klik **Deploy**. Framework: *Other*, output: folder akar.
4. Buka tautan yang diberikan di HP, lalu masukkan tautan itu ke Lampiran 4 esai.

Alternatif lewat terminal: `npx vercel --prod` di dalam folder ini.

## Alur demo yang disarankan

1. **Dapur** → SPPG Tampan 1. Tiga batch hari ini mengikuti skenario Gambar 2 pada esai (matang 04.00, 04.30, 05.00).
2. Buka satu batch → **Buka kartu label**. Tampilkan kartu di layar laptop (kecerahan penuh) atau cetak.
3. Di HP, buka **Guru** → **Pindai QR batch** → arahkan ke QR kartu. Lalu **Buka kamera**, posisikan lingkaran label di lingkaran putih bidikan, tekan **Baca warna**.
4. Tekan tombol jam (kanan atas) → **1 menit = 1 jam** untuk melihat label berubah dari cokelat ke kuning.
5. Buka **Pengawas** untuk melihat skor risiko dan peringatan.

Tanpa kamera, gunakan **Label simulasi** atau pilih warna secara manual.

## Catatan teknis

- Aplikasi statis (HTML, CSS, JavaScript murni), tanpa proses build dan tanpa server.
- Data contoh disimpan di `localStorage` peramban. Tombol jam → **Atur ulang data contoh** mengembalikan data awal.
- Pemindai QR otomatis memakai `BarcodeDetector` bawaan Chrome di Android. Di peramban lain, pilih batch dari daftar.
- Pembacaan warna: rata-rata RGB lingkaran label di tengah bidikan dikoreksi terhadap cincin putih kartu, lalu dicocokkan ke skala warna label di ruang warna Lab. Prinsipnya mengikuti analisis RGB citra pada Rachmawati dkk. (2016).
- Model label: label penuh kuning setelah ±4 jam pada 27°C; laju berlipat dua tiap kenaikan 10°C (asumsi Q10 = 2). Angka ini perlu dikalibrasi ulang untuk menu MBG (Lampiran 3 esai).
- Semua SPPG, sekolah, dan batch adalah **data contoh**, bukan data resmi.

## Struktur folder

```
index.html            halaman utama
css/app.css           tampilan
js/store.js           data contoh, jam simulasi, model label, keputusan, skor risiko
js/ui.js              dial label, kamera, pembacaan warna
js/app.js             halaman Dapur, Guru, Pengawas, kartu label
vendor/qrcode.js      pembuat QR (Kazuhiko Arase, lisensi MIT)
assets/ikon.svg       ikon aplikasi
manifest.webmanifest  agar bisa dipasang ke layar utama HP
```

## Lisensi pustaka

`vendor/qrcode.js`: QRCode for JavaScript, Copyright (c) 2009 Kazuhiko Arase, lisensi MIT. "QR Code" adalah merek dagang terdaftar DENSO WAVE INCORPORATED.
