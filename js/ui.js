/* SAKSI prototipe: komponen tampilan bersama (dial label, kamera, helper). */
(function () {
  const S = window.SAKSI;

  const esc = (S.esc = (v) =>
    String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));

  S.NAMA_KELAS = { aman: "Cokelat (segar)", segera: "Cokelat kekuningan", tahan: "Kuning terang" };
  S.NAMA_KEP = { bagikan: "Bagikan sekarang", segera: "Segera bagikan", tahan: "Tahan batch ini" };
  S.SUB_KEP = {
    bagikan: "Makanan masih dalam batas aman.",
    segera: "Bagikan dalam 30 menit ke depan, jangan disimpan lagi.",
    tahan: "Jangan dibagikan. Sisihkan sampel dan tunggu arahan SPPG.",
  };

  // ---------- dial label ----------
  // Cincin luar = kartu warna referensi (rentang aman, segera, tahan); lingkaran dalam = warna label.
  const MAXI = 1.25;
  function arc(cx, cy, r, a0, a1) {
    const p = (a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  S.dial = function (idx, opts = {}) {
    const size = opts.size || 120, c = 50, ang = (i) => (Math.min(i, MAXI) / MAXI) * Math.PI * 2;
    const has = idx != null;
    const col = has ? S.rgbHex(S.warnaPada(idx)) : "#e6e3e8";
    const seg = [
      [0, 0.5, S.REF.aman],
      [0.5, 1, S.REF.segera],
      [1, MAXI, S.REF.tahan],
    ];
    const gap = 0.035;
    const ring = seg
      .map(([a, b, rgb]) => `<path d="${arc(c, c, 44, ang(a) + gap, ang(b) - gap)}" stroke="${S.rgbHex(rgb)}" stroke-width="8" fill="none" stroke-linecap="round"/>`)
      .join("");
    let marker = "";
    if (has) {
      const a = ang(idx);
      marker = `<circle cx="${(c + 44 * Math.sin(a)).toFixed(2)}" cy="${(c - 44 * Math.cos(a)).toFixed(2)}" r="5.2" fill="#fff" stroke="#2b1630" stroke-width="2.4"/>`;
    }
    const label = opts.label ? `<text x="50" y="${opts.sub ? 50 : 54}" text-anchor="middle" class="dial-t">${esc(opts.label)}</text>` : "";
    const sub = opts.sub ? `<text x="50" y="62" text-anchor="middle" class="dial-s">${esc(opts.sub)}</text>` : "";
    const dark = has && idx < 0.85;
    return `<svg class="dial ${dark ? "is-dark" : ""}" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${has ? "Label " + esc(S.NAMA_KELAS[S.kelasDariIndeks(idx)]) : "Label belum aktif"}">
      ${ring}<circle cx="50" cy="50" r="35" fill="#fff"/><circle cx="50" cy="50" r="${opts.flat ? 31 : 30}" fill="${col}" ${has ? "" : 'stroke="#cfcad3" stroke-dasharray="3 3"'}/>${marker}${label}${sub}</svg>`;
  };

  S.chip = (kelas, teks) => `<span class="chip chip-${kelas}">${esc(teks)}</span>`;
  S.chipKelas = (kelas) => (kelas ? S.chip(kelas, S.NAMA_KELAS[kelas]) : S.chip("netral", "Label belum aktif"));
  S.chipKep = (kep) => S.chip(kep === "bagikan" ? "aman" : kep, kep === "bagikan" ? "Dibagikan" : kep === "segera" ? "Dibagikan segera" : "Ditahan");

  // jumlah titik jurnal yang sudah dicatat
  S.progres = (b) => S.LANGKAH.filter((l) => b.ev[l.kunci]).length;
  S.langkahBerikut = (b) => S.LANGKAH.find((l) => !b.ev[l.kunci]);

  // ---------- kamera ----------
  let stream = null, qrLoop = null;
  S.kamera = {
    adaKamera: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    adaQR: () => "BarcodeDetector" in window,
    async mulai(video) {
      S.kamera.berhenti();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
      video.srcObject = stream;
      video.setAttribute("playsinline", "");
      await video.play();
    },
    berhenti() {
      if (qrLoop) { clearInterval(qrLoop); qrLoop = null; }
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    },
    async pindaiQR(video, onHasil) {
      const det = new window.BarcodeDetector({ formats: ["qr_code"] });
      qrLoop = setInterval(async () => {
        if (video.readyState < 2) return;
        try {
          const kode = await det.detect(video);
          if (kode && kode[0]) { S.kamera.berhenti(); onHasil(kode[0].rawValue); }
        } catch (e) { /* bingkai berikutnya */ }
      }, 300);
    },
    // Ambil rata-rata warna lingkaran label di tengah dan cincin putih di sekitarnya,
    // lalu koreksi warna terhadap putih kartu (prinsip analisis RGB seperti ImageJ).
    sampel(sumber) {
      const w = sumber.videoWidth || sumber.naturalWidth || sumber.width;
      const h = sumber.videoHeight || sumber.naturalHeight || sumber.height;
      const kecil = 320 / Math.max(w, h);
      const cw = Math.round(w * kecil), ch = Math.round(h * kecil);
      const cv = document.createElement("canvas");
      cv.width = cw; cv.height = ch;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(sumber, 0, 0, cw, ch);
      const px = ctx.getImageData(0, 0, cw, ch).data;
      const m = Math.min(cw, ch), cx = cw / 2, cy = ch / 2;
      const rata = (r0, r1) => {
        let r = 0, g = 0, b = 0, n = 0;
        const rp = r1 * m;
        for (let y = Math.floor(cy - rp); y <= cy + rp; y++)
          for (let x = Math.floor(cx - rp); x <= cx + rp; x++) {
            const d = Math.hypot(x - cx, y - cy);
            if (d < r0 * m || d > r1 * m || x < 0 || y < 0 || x >= cw || y >= ch) continue;
            const i = (y * cw + x) * 4;
            r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
          }
        return n ? [r / n, g / n, b / n] : [0, 0, 0];
      };
      const label = rata(0, 0.1);
      const putih = rata(0.17, 0.21);
      const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      const koreksi = lum(putih) > 90;
      const rgb = label.map((v, i) => Math.max(0, Math.min(255, Math.round(koreksi ? (v * 245) / Math.max(1, putih[i]) : v))));
      return { rgb, mentah: label.map(Math.round), putih: putih.map(Math.round), koreksi };
    },
  };

  // ---------- QR ----------
  S.qrIsi = (id) => `SAKSI|${id}`;
  S.qrBaca = (teks) => {
    const m = /^SAKSI\|([A-Z0-9-]+)$/.exec(String(teks).trim());
    return m ? m[1] : null;
  };

  // ---------- pembaruan hidup ----------
  // Elemen dengan data-live diperbarui tiap detik tanpa merender ulang halaman.
  S.tick = function () {
    const t = S.now();
    document.querySelectorAll("[data-jam]").forEach((el) => (el.textContent = S.fmtJam(t)));
    document.querySelectorAll("[data-tgl]").forEach((el) => (el.textContent = S.fmtTgl(t)));
    document.querySelectorAll("[data-live-dial]").forEach((el) => {
      const b = S.batch(el.dataset.liveDial);
      if (!b) return;
      const idx = S.indeksLabel(b, b.ev.saji ? b.ev.saji.t : t);
      const size = +el.dataset.size || 120;
      el.innerHTML = S.dial(idx, { size, label: el.dataset.teks === "jam" && b.ev.kemas ? S.fmtDurasi(((b.ev.saji ? b.ev.saji.t : t) - b.ev.kemas.t) / S.H) : "", sub: el.dataset.teks === "jam" && b.ev.kemas ? "sejak aktif" : "" });
    });
    document.querySelectorAll("[data-live-jeda]").forEach((el) => {
      const b = S.batch(el.dataset.liveJeda);
      if (!b) return;
      el.textContent = S.fmtDurasi(S.jedaJam(b, b.ev.saji ? b.ev.saji.t : t));
    });
    document.querySelectorAll("[data-live-kelas]").forEach((el) => {
      const b = S.batch(el.dataset.liveKelas);
      if (!b) return;
      el.innerHTML = S.chipKelas(S.kelasDariIndeks(S.indeksLabel(b, b.ev.saji ? b.ev.saji.t : t)));
    });
  };
})();
