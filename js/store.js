/* SAKSI prototipe: data contoh, jam simulasi, model label, keputusan, dan skor risiko.
   Semua data SPPG, sekolah, dan batch di sini adalah data contoh untuk demonstrasi. */
(function () {
  const S = (window.SAKSI = window.SAKSI || {});
  const KEY = "saksi-demo-v2";
  const H = 3600e3, MIN = 60e3;

  const C = (S.C = {
    LABEL_JAM: 4, // label penuh kuning setelah ±4 jam pada suhu acuan (Rachmawati dkk., 2016)
    WHO_JAM: 2, // batas WHO (2006) makanan matang di suhu ruang
    BGN_JAM: 4, // batas konsumsi BGN (iNews, 2026a)
    Q10: 2, // asumsi laju reaksi berlipat dua tiap kenaikan 10°C
    T_ACUAN: 27, // suhu ruang acuan kalibrasi
    OMPRENG_PER_BOKS: 25,
    SUHU_INTI_MIN: 70,
    JEDA_KEMAS_MAKS: 1, // jam, matang ke kemas
  });

  const KELOMPOK = ["PAUD dan SD kelas 1-3", "SD kelas 4-6", "SMP dan SMA"];
  S.KELOMPOK = KELOMPOK;
  S.MENU = [
    "Nasi, ayam goreng, tumis buncis, pisang",
    "Nasi, telur balado, sayur sop, jeruk",
    "Nasi, ikan patin bumbu kuning, tumis kangkung, semangka",
    "Nasi, semur daging, capcay, pepaya",
    "Nasi, ayam suwir, tempe goreng, sayur bening, melon",
    "Nasi, gulai ikan tongkol, tahu bacem, salak",
  ];

  // Profil dapur contoh (Provinsi Riau). matang = jam matang per kelompok; saji = jam disantap.
  const SPPG = [
    { id: "TMP1", nama: "SPPG Tampan 1", wilayah: "Pekanbaru", slhs: true, insiden90: 0,
      sekolah: ["TK Pertiwi Tampan", "SDN 101 Tampan", "SMPN 21 Pekanbaru"],
      profil: { matang: [4, 6, 8], saji: [7.5, 9.5, 11.5], lewati: 0.03, suhu: 30 } },
    { id: "MPD1", nama: "SPPG Marpoyan Damai", wilayah: "Pekanbaru", slhs: true, insiden90: 0,
      sekolah: ["TK Aisyiyah Marpoyan", "SDN 45 Marpoyan", "SMPN 13 Pekanbaru"],
      profil: { matang: [5.75, 7.75, 9.75], saji: [7.5, 9.5, 11.5], lewati: 0.0, suhu: 30 } },
    { id: "SKH2", nama: "SPPG Siak Hulu 2", wilayah: "Kampar", slhs: false, insiden90: 0,
      sekolah: ["TK Negeri Siak Hulu", "SDN 012 Pandau", "SMPN 2 Siak Hulu"],
      profil: { matang: [4.5, 6, 7.75], saji: [7.5, 9.5, 11.5], lewati: 0.05, suhu: 31 } },
    { id: "RMB1", nama: "SPPG Rumbai Barat", wilayah: "Pekanbaru", slhs: true, insiden90: 0,
      sekolah: ["TK Kartika Rumbai", "SDN 88 Rumbai", "SMAN 15 Pekanbaru"],
      profil: { matang: [5.75, 7.75, 9.75], saji: [7.5, 9.5, 11.5], lewati: 0.02, suhu: 30 } },
    { id: "BKN1", nama: "SPPG Bangkinang Kota", wilayah: "Kampar", slhs: true, insiden90: 2,
      sekolah: ["TK Pembina Bangkinang", "SDN 003 Bangkinang", "SMAN 1 Bangkinang"],
      profil: { matang: [2.5, 3, 3.5], saji: [7.5, 9.5, 11.5], lewati: 0.12, suhu: 32 } },
    { id: "MNS1", nama: "SPPG Minas", wilayah: "Siak", slhs: false, insiden90: 1,
      sekolah: ["TK Nurul Huda Minas", "SDN 05 Minas", "SMPN 1 Minas"],
      profil: { matang: [5, 6.5, 8], saji: [7.5, 9.5, 11.5], lewati: 0.3, suhu: 31 } },
  ];

  const LANGKAH = (S.LANGKAH = [
    { kunci: "terima", nama: "Terima bahan", siapa: "Petugas dapur" },
    { kunci: "matang", nama: "Matang", siapa: "Petugas dapur" },
    { kunci: "kemas", nama: "Porsi, kemas, aktifkan label", siapa: "Petugas dapur" },
    { kunci: "berangkat", nama: "Berangkat", siapa: "Sopir" },
    { kunci: "tiba", nama: "Tiba di sekolah", siapa: "Sopir atau guru" },
    { kunci: "saji", nama: "Gerbang saji", siapa: "Guru" },
  ]);

  // ---------- util ----------
  let seedN = 7;
  const rnd = () => ((seedN = (seedN * 16807) % 2147483647) / 2147483647);
  const pad = (n) => String(n).padStart(2, "0");
  function hariMulai(off, base) {
    const d = new Date(base || Date.now());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + off);
    return d.getTime();
  }
  S.hariMulai = hariMulai;

  // ---------- model label (TTI antosianin) ----------
  const STOPS = [
    [0, [104, 62, 36]],
    [0.5, [140, 92, 42]],
    [0.75, [184, 136, 46]],
    [1.0, [233, 197, 58]],
    [1.3, [242, 214, 92]],
  ];
  function warnaPada(idx) {
    const t = Math.max(0, Math.min(1.3, idx));
    for (let i = 1; i < STOPS.length; i++) {
      if (t <= STOPS[i][0]) {
        const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i];
        const k = (t - a) / (b - a);
        return ca.map((v, j) => Math.round(v + (cb[j] - v) * k));
      }
    }
    return STOPS[STOPS.length - 1][1];
  }
  S.warnaPada = warnaPada;
  S.rgbHex = (c) => "#" + c.map((v) => pad(v.toString(16))).join("");
  S.REF = { aman: warnaPada(0.2), segera: warnaPada(0.75), tahan: warnaPada(1.12) };

  const faktorSuhu = (T) => Math.pow(C.Q10, (T - C.T_ACUAN) / 10);
  S.faktorSuhu = faktorSuhu;

  // indeks 0..1+ : 1 berarti label sudah penuh kuning
  function indeksLabel(b, t) {
    if (!b.ev.kemas) return null;
    const jam = Math.max(0, t - b.ev.kemas.t) / H;
    return (jam * faktorSuhu(b.suhu)) / C.LABEL_JAM;
  }
  S.indeksLabel = indeksLabel;
  const kelasDariIndeks = (S.kelasDariIndeks = (i) => (i == null ? null : i < 0.5 ? "aman" : i < 1 ? "segera" : "tahan"));

  // warna RGB → Lab untuk pencocokan warna kamera
  function lab(rgb) {
    const f = (c) => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
    const [r, g, b] = rgb.map(f);
    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    const g3 = (v) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
    x = g3(x); y = g3(y); z = g3(z);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }
  const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  // proyeksikan warna terukur ke skala label → indeks dan jarak kecocokan
  S.bacaWarna = function (rgb) {
    const L = lab(rgb);
    let best = { idx: 0, d: 1e9 };
    for (let i = 0; i <= 130; i++) {
      const idx = i / 100, d = dE(L, lab(warnaPada(idx)));
      if (d < best.d) best = { idx, d };
    }
    return { idx: best.idx, kelas: kelasDariIndeks(best.idx), jarak: best.d, yakin: best.d < 18 };
  };

  // ---------- keputusan gerbang saji ----------
  S.jedaJam = (b, t) => (b.ev.matang ? Math.max(0, t - b.ev.matang.t) / H : null);
  S.putuskan = function (kelasLabel, jeda) {
    const alasan = [];
    if (kelasLabel === "tahan") alasan.push("Label sudah kuning terang");
    if (jeda != null && jeda > C.BGN_JAM) alasan.push(`Jeda sejak matang lebih dari ${C.BGN_JAM} jam`);
    if (alasan.length) return { hasil: "tahan", alasan };
    if (kelasLabel === "segera") alasan.push("Label mulai berubah ke kuning");
    if (jeda != null && jeda > C.WHO_JAM) alasan.push(`Jeda sejak matang lebih dari ${C.WHO_JAM} jam`);
    if (alasan.length) return { hasil: "segera", alasan };
    return { hasil: "bagikan", alasan: ["Label masih cokelat", `Jeda sejak matang kurang dari ${C.WHO_JAM} jam`] };
  };

  // ---------- jam simulasi ----------
  let st;
  const now = (S.now = () => st.jam.dasar + (Date.now() - st.jam.anchor) * st.jam.laju);
  S.laju = () => st.jam.laju;
  S.aturLaju = function (laju) {
    st.jam = { dasar: now(), anchor: Date.now(), laju };
    simpan();
  };
  S.majukan = function (menit) {
    st.jam.dasar += menit * MIN;
    simpan();
  };

  // ---------- pembuatan data contoh ----------
  function idBatch(sppgId, hari, n) {
    const d = new Date(hari);
    return `${sppgId}-${pad(d.getDate())}${pad(d.getMonth() + 1)}-${n}`;
  }
  function buatBatch(sp, hari, k, menu) {
    const porsi = [180, 220, 260][k] + Math.round(rnd() * 40);
    return {
      id: idBatch(sp.id, hari, k + 1), sppgId: sp.id, hari, menu,
      sekolah: sp.sekolah[k], kelompok: KELOMPOK[k], porsi,
      boks: Math.ceil(porsi / C.OMPRENG_PER_BOKS), suhu: sp.profil.suhu,
      ev: {}, bacaan: [], laporan: null,
    };
  }
  const jit = (m) => (rnd() * 2 - 1) * m * MIN;

  function seed() {
    seedN = 7;
    const today = hariMulai(0);
    const data = { v: 2, sppg: SPPG.map((s) => ({ ...s })), batch: [], jam: { dasar: today + 6.67 * H, anchor: Date.now(), laju: 1 } };

    // riwayat 7 hari
    for (const sp of data.sppg) {
      for (let d = -7; d <= -1; d++) {
        const hari = hariMulai(d);
        for (let k = 0; k < 3; k++) {
          const b = buatBatch(sp, hari, k, S.MENU[(d + 7 + k + sp.id.length) % S.MENU.length]);
          const p = sp.profil;
          const tMatang = hari + p.matang[k] * H + jit(20);
          const tSaji = hari + p.saji[k] * H + jit(15);
          const lewat = () => rnd() < p.lewati;
          if (!lewat()) b.ev.terima = { t: tMatang - 2 * H, suhuBahan: 4 + Math.round(rnd() * 3), uji: "negatif" };
          b.ev.matang = { t: tMatang, suhuInti: 72 + Math.round(rnd() * 10) };
          b.ev.kemas = { t: tMatang + 20 * MIN + jit(5) };
          if (!lewat()) b.ev.berangkat = { t: Math.min(tSaji - 50 * MIN, tMatang + 1.5 * H) };
          if (!lewat()) b.ev.tiba = { t: tSaji - 25 * MIN + jit(10) };
          const idx = indeksLabel(b, tSaji), jeda = S.jedaJam(b, tSaji);
          const kelas = kelasDariIndeks(idx);
          const kep = S.putuskan(kelas, jeda);
          const rgb = warnaPada(idx).map((v) => Math.max(0, Math.min(255, Math.round(v + (rnd() * 2 - 1) * 4))));
          b.bacaan.push({ t: tSaji - 2 * MIN, sumber: "kamera", rgb, idx: +idx.toFixed(2), kelas });
          b.ev.saji = { t: tSaji, keputusan: kep.hasil, oleh: "Guru " + sp.sekolah[k] };
          if (kep.hasil === "tahan") b.laporan = { t: tSaji, alasan: kep.alasan };
          data.batch.push(b);
        }
      }
    }

    // hari ini (jam simulasi mulai 06.40)
    const h = today;
    const at = (jam) => h + jam * H;
    const add = (sp, k, ev, opsi = {}) => {
      const b = buatBatch(sp, h, k, opsi.menu || S.MENU[k]);
      Object.assign(b, opsi.extra || {});
      b.ev = ev;
      data.batch.push(b);
    };
    const sp = Object.fromEntries(data.sppg.map((s) => [s.id, s]));
    // Skenario Gambar 2 pada esai
    add(sp.TMP1, 0, { terima: { t: at(2.1), suhuBahan: 5, uji: "negatif" }, matang: { t: at(4), suhuInti: 78 }, kemas: { t: at(4.33) }, berangkat: { t: at(5.83) }, tiba: { t: at(6.5) } }, { menu: S.MENU[0] });
    add(sp.TMP1, 1, { terima: { t: at(2.1), suhuBahan: 5, uji: "negatif" }, matang: { t: at(4.5), suhuInti: 76 }, kemas: { t: at(4.83) }, berangkat: { t: at(6.33) } }, { menu: S.MENU[0] });
    add(sp.TMP1, 2, { terima: { t: at(2.1), suhuBahan: 5, uji: "negatif" }, matang: { t: at(5), suhuInti: 74 }, kemas: { t: at(5.33) } }, { menu: S.MENU[0] });
    add(sp.BKN1, 0, { matang: { t: at(2.67), suhuInti: 68 }, kemas: { t: at(3) }, berangkat: { t: at(5) }, tiba: { t: at(5.67) } }, { menu: S.MENU[2] });
    add(sp.BKN1, 1, { matang: { t: at(3), suhuInti: 73 }, kemas: { t: at(3.33) }, berangkat: { t: at(6) } }, { menu: S.MENU[2] });
    add(sp.MPD1, 0, { terima: { t: at(3.5), suhuBahan: 6, uji: "positif", catatan: "Formalin positif pada tahu, bahan ditolak dan diganti" }, matang: { t: at(5.75), suhuInti: 80 }, kemas: { t: at(6.05) } }, { menu: S.MENU[1] });
    add(sp.RMB1, 0, { terima: { t: at(3.6), suhuBahan: 4, uji: "negatif" }, matang: { t: at(5.67), suhuInti: 79 }, kemas: { t: at(6) }, berangkat: { t: at(6.5) } }, { menu: S.MENU[3] });
    add(sp.SKH2, 0, { terima: { t: at(2.8), suhuBahan: 7, uji: "negatif" }, matang: { t: at(4.83), suhuInti: 75 }, kemas: { t: at(5.17) }, berangkat: { t: at(6) }, tiba: { t: at(6.58) } }, { menu: S.MENU[4] });
    add(sp.MNS1, 0, { matang: { t: at(5.17), suhuInti: 72 }, kemas: { t: at(5.5) } }, { menu: S.MENU[5] });
    return data;
  }

  // ---------- simpan/muat ----------
  function simpan() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* mode privat: data hanya di memori */ }
  }
  function muat() {
    try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) { st = null; }
    if (!st || st.v !== 2) { st = seed(); simpan(); }
  }
  S.simpan = simpan;
  S.atur_ulang = function () { st = seed(); simpan(); };
  muat();

  // ---------- akses data ----------
  S.daftarSppg = () => st.sppg;
  S.sppg = (id) => st.sppg.find((s) => s.id === id);
  S.batch = (id) => st.batch.find((b) => b.id === id);
  S.batchHari = (off = 0) => {
    const h = hariMulai(off, now());
    return st.batch.filter((b) => b.hari === h);
  };
  S.batchSppg = (sppgId, hariDari) => st.batch.filter((b) => b.sppgId === sppgId && b.hari >= hariDari);
  S.semuaBatch = () => st.batch;

  S.buatBatchBaru = function ({ sppgId, sekolah, menu, porsi, suhu }) {
    const sp = S.sppg(sppgId);
    const h = hariMulai(0, now());
    const n = st.batch.filter((b) => b.sppgId === sppgId && b.hari === h).length + 1;
    const k = Math.max(0, sp.sekolah.indexOf(sekolah));
    const b = {
      id: idBatch(sppgId, h, n), sppgId, hari: h, menu, sekolah, kelompok: KELOMPOK[k],
      porsi, boks: Math.ceil(porsi / C.OMPRENG_PER_BOKS), suhu: suhu || 30, ev: {}, bacaan: [], laporan: null,
    };
    st.batch.push(b);
    simpan();
    return b;
  };
  S.catat = function (id, kunci, data = {}) {
    const b = S.batch(id);
    b.ev[kunci] = { t: now(), ...data };
    simpan();
    return b;
  };
  S.aturSuhu = function (id, suhu) { S.batch(id).suhu = suhu; simpan(); };
  S.simpanBacaan = function (id, bacaan) {
    const b = S.batch(id);
    b.bacaan.push({ t: now(), ...bacaan });
    simpan();
  };
  S.putuskanSaji = function (id, keputusan, alasan, oleh) {
    const b = S.batch(id);
    if (!b.ev.tiba) b.ev.tiba = { t: now(), otomatis: true };
    b.ev.saji = { t: now(), keputusan, oleh };
    if (keputusan === "tahan") b.laporan = { t: now(), alasan };
    simpan();
  };

  // ---------- peringatan ----------
  S.peringatan = function (b, t = now()) {
    const out = [];
    const sp = S.sppg(b.sppgId);
    const base = { batchId: b.id, sppg: sp.nama };
    if (b.ev.terima && b.ev.terima.uji === "positif")
      out.push({ ...base, t: b.ev.terima.t, level: "tahan", teks: b.ev.terima.catatan || "Uji cepat bahan berbahaya positif" });
    if (b.ev.matang && b.ev.matang.suhuInti < C.SUHU_INTI_MIN)
      out.push({ ...base, t: b.ev.matang.t, level: "segera", teks: `Suhu inti ${b.ev.matang.suhuInti}°C, di bawah ${C.SUHU_INTI_MIN}°C` });
    if (b.ev.matang && b.ev.kemas && (b.ev.kemas.t - b.ev.matang.t) / H > C.JEDA_KEMAS_MAKS)
      out.push({ ...base, t: b.ev.kemas.t, level: "segera", teks: "Jeda matang ke kemas lebih dari 1 jam" });
    if (b.laporan) out.push({ ...base, t: b.laporan.t, level: "tahan", teks: `Batch ditahan di ${b.sekolah}` });
    else if (!b.ev.saji) {
      const kelas = kelasDariIndeks(indeksLabel(b, t));
      if (kelas === "tahan") out.push({ ...base, t, level: "tahan", teks: `Label kuning sebelum disajikan (${b.sekolah})` });
    }
    return out;
  };

  // ---------- skor risiko (Lampiran 5 esai) ----------
  S.skorRisiko = function (sppgId) {
    const dari = hariMulai(-7, now());
    const bs = S.batchSppg(sppgId, dari).filter((b) => b.ev.saji);
    const sp = S.sppg(sppgId);
    const n = Math.max(1, bs.length);
    const kuning = bs.filter((b) => b.ev.saji.keputusan === "tahan" || b.bacaan.some((r) => r.kelas === "tahan")).length / n;
    const lengkap = bs.reduce((a, b) => a + LANGKAH.filter((l) => b.ev[l.kunci]).length / LANGKAH.length, 0) / n;
    const jeda = bs.reduce((a, b) => a + (b.ev.saji.t - b.ev.matang.t) / H, 0) / n;
    const k = {
      label: 35 * Math.min(1, kuning / 0.3),
      jurnal: 25 * Math.min(1, (1 - lengkap) / 0.1),
      jeda: 20 * Math.max(0, Math.min(1, (jeda - C.WHO_JAM) / (C.BGN_JAM - C.WHO_JAM))),
      slhs: sp.slhs ? 0 : 10,
      insiden: 10 * Math.min(1, sp.insiden90 / 2),
    };
    const total = Math.round(Object.values(k).reduce((a, v) => a + v, 0));
    const kategori = total >= 70 ? "merah" : total >= 40 ? "kuning" : "hijau";
    return { total, kategori, k, rinci: { kuning, lengkap, jeda, n: bs.length } };
  };

  // ---------- format ----------
  const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  S.fmtJam = (t) => { const d = new Date(t); return `${pad(d.getHours())}.${pad(d.getMinutes())}`; };
  S.fmtTgl = (t) => { const d = new Date(t); return `${HARI[d.getDay()]}, ${d.getDate()} ${BLN[d.getMonth()]}`; };
  S.fmtDurasi = (jam) => {
    if (jam == null) return "belum ada";
    const m = Math.round(jam * 60);
    return m < 60 ? `${m} m` : `${Math.floor(m / 60)} j ${pad(m % 60)} m`;
  };
  S.H = H; S.MIN = MIN;
})();
