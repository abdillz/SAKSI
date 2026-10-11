/* SAKSI prototipe: halaman dan navigasi. */
(function () {
  const S = window.SAKSI;
  const esc = S.esc;
  const $ = (sel, root = document) => root.querySelector(sel);
  const app = $("#app");
  const pref = { sppg: "TMP1", sekolah: "SDN 101 Tampan" };
  try { Object.assign(pref, JSON.parse(sessionStorage.getItem("saksi-pref") || "{}")); } catch (e) { /* abaikan */ }
  const simpanPref = () => { try { sessionStorage.setItem("saksi-pref", JSON.stringify(pref)); } catch (e) { /* abaikan */ } };
  const go = (h) => (location.hash = h);

  // ================= BERANDA =================
  function beranda() {
    const sp = S.sppg("TMP1");
    return `
    <section class="hero">
      <div class="hero-teks">
        <h1>Bukti waktu dan suhu untuk setiap batch Makan Bergizi Gratis</h1>
        <p class="lead">SAKSI membaca label antosianin kulit manggis lewat kamera ponsel, mencatat enam titik kritis dari dapur sampai kelas, lalu memberi tahu guru apakah makanan masih layak dibagikan.</p>
        <div class="hero-aksi">
          <a class="btn btn-utama" href="#/dapur">Buka mode Dapur</a>
          <a class="btn" href="#/guru">Buka mode Guru</a>
        </div>
      </div>
      <figure class="hero-dial">
        <div id="dial-demo" aria-hidden="true">${S.dial(0.2, { size: 280 })}</div>
        <figcaption><span id="dial-demo-jam">0 j 00 m</span> sejak label aktif pada suhu ruang 30°C. Label berubah dari cokelat ke kuning terang setelah sekitar 4 jam.</figcaption>
      </figure>
    </section>

    <section class="peran">
      <h2>Tiga peran, satu batch</h2>
      <ul class="peran-list">
        <li><a href="#/dapur"><strong>Dapur SPPG</strong><span>Petugas mencatat terima bahan, suhu inti saat matang, lalu mengaktifkan label dan mencetak QR untuk tiap batch.</span></a></li>
        <li><a href="#/guru"><strong>Guru di sekolah</strong><span>Guru memindai QR dan label sebelum makanan dibagikan. Aplikasi memutuskan dari warna label dan jeda sejak matang.</span></a></li>
        <li><a href="#/pengawas"><strong>Pengawas BGN dan dinas kesehatan</strong><span>Skor risiko harian tiap SPPG menunjukkan dapur mana yang perlu diinspeksi lebih dulu.</span></a></li>
      </ul>
    </section>

    <section class="coba">
      <h2>Cara mencoba demo</h2>
      <ol>
        <li>Buka <a href="#/dapur">Dapur</a> untuk ${esc(sp.nama)}. Tiga batch hari ini mengikuti skenario Gambar 2 pada esai.</li>
        <li>Buka salah satu batch, lalu pilih <em>Kartu label</em>. Tampilkan kartu itu di layar lain atau cetak.</li>
        <li>Buka <a href="#/guru">Guru</a> di ponsel, pindai QR, lalu arahkan kamera ke label. Tanpa kamera, pakai pilihan <em>Label simulasi</em>.</li>
        <li>Percepat jam simulasi dari tombol jam di kanan atas untuk melihat label berubah warna, lalu cek <a href="#/pengawas">dasbor Pengawas</a>.</li>
      </ol>
    </section>`;
  }
  let demoTimer = null;
  function mulaiDemoDial() {
    clearInterval(demoTimer);
    const el = $("#dial-demo"), jam = $("#dial-demo-jam");
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const f = S.faktorSuhu(30);
    const set = (idx) => {
      el.innerHTML = S.dial(idx, { size: 280, label: S.NAMA_KELAS[S.kelasDariIndeks(idx)].split(" (")[0] });
      jam.textContent = S.fmtDurasi((idx * S.C.LABEL_JAM) / f);
    };
    if (reduce) return set(0.75);
    let idx = 0;
    set(idx);
    demoTimer = setInterval(() => {
      idx += 0.012;
      if (idx > 1.2) idx = 0;
      if (!document.body.contains(el)) return clearInterval(demoTimer);
      set(idx);
    }, 80);
  }

  // ================= DAPUR =================
  function pilihSppg() {
    return `<label class="pilih"><span>SPPG</span><select id="pilih-sppg">${S.daftarSppg()
      .map((s) => `<option value="${s.id}" ${s.id === pref.sppg ? "selected" : ""}>${esc(s.nama)}, ${esc(s.wilayah)}</option>`)
      .join("")}</select></label>`;
  }
  function barisBatch(b, mode) {
    const t = S.now();
    const idx = S.indeksLabel(b, b.ev.saji ? b.ev.saji.t : t);
    const berikut = S.langkahBerikut(b);
    const href = mode === "guru" ? `#/guru/b/${b.id}` : `#/dapur/b/${b.id}`;
    const status = b.ev.saji ? S.chipKep(b.ev.saji.keputusan) : `<span class="muted">Berikutnya: ${esc(berikut.nama.toLowerCase())}</span>`;
    return `<li><a class="batch" href="${href}">
      <span data-live-dial="${b.id}" data-size="56">${S.dial(idx, { size: 56 })}</span>
      <span class="batch-info">
        <strong>${esc(mode === "guru" ? b.menu : b.sekolah)}</strong>
        <span class="muted">${esc(mode === "guru" ? S.sppg(b.sppgId).nama : b.kelompok)}, ${b.porsi} porsi, ${b.boks} boks</span>
        <span class="batch-status">${status}</span>
      </span>
      <span class="batch-angka"><span class="tabular" data-live-jeda="${b.id}">${S.fmtDurasi(S.jedaJam(b, b.ev.saji ? b.ev.saji.t : t))}</span><small>sejak matang</small></span>
    </a></li>`;
  }
  function dapur() {
    const sp = S.sppg(pref.sppg);
    const hariIni = S.batchHari(0).filter((b) => b.sppgId === sp.id);
    const per = hariIni.flatMap((b) => S.peringatan(b));
    return `
    <div class="kolom">
      <header class="hal-kepala">
        <h1>Dapur</h1>
        ${pilihSppg()}
        <p class="muted">${esc(sp.wilayah)}, ${sp.slhs ? "sudah bersertifikat SLHS" : "SLHS masih diproses"}. <span data-tgl></span>.</p>
      </header>
      ${per.length ? `<section class="peringatan-box" aria-live="polite"><h2>Perlu perhatian</h2><ul>${per.map((p) => `<li class="p-${p.level}"><a href="#/dapur/b/${p.batchId}">${esc(p.teks)}</a><span class="muted tabular">${S.fmtJam(p.t)}</span></li>`).join("")}</ul></section>` : ""}
      <section>
        <div class="judul-aksi"><h2>Batch hari ini</h2><a class="btn btn-utama" href="#/dapur/baru">Buat batch</a></div>
        ${hariIni.length ? `<ul class="daftar-batch">${hariIni.map((b) => barisBatch(b, "dapur")).join("")}</ul>` : `<p class="kosong">Belum ada batch hari ini. Buat batch pertama sebelum mulai memasak.</p>`}
      </section>
    </div>`;
  }
  function dapurBaru() {
    const sp = S.sppg(pref.sppg);
    return `
    <div class="kolom">
      <a class="kembali" href="#/dapur">Kembali ke daftar batch</a>
      <h1>Buat batch</h1>
      <p class="muted">${esc(sp.nama)}. Satu batch berarti satu menu untuk satu sekolah tujuan.</p>
      <form id="form-baru" class="form">
        <label>Sekolah tujuan<select name="sekolah" required>${sp.sekolah.map((s, i) => `<option value="${esc(s)}">${esc(s)} (${esc(S.KELOMPOK[i])})</option>`).join("")}</select></label>
        <label>Menu<select name="menu">${S.MENU.map((m) => `<option>${esc(m)}</option>`).join("")}</select></label>
        <label>Jumlah porsi<input name="porsi" type="number" min="25" max="3000" step="1" value="220" required inputmode="numeric"></label>
        <p class="muted" id="info-boks">9 boks distribusi, satu label per boks.</p>
        <button class="btn btn-utama" type="submit">Buat batch</button>
      </form>
    </div>`;
  }

  function formLangkah(b, l) {
    switch (l.kunci) {
      case "terima":
        return `<form class="form langkah-form" data-kunci="terima">
          <label>Suhu bahan segar saat diterima (°C)<input name="suhuBahan" type="number" step="0.5" value="5" required inputmode="decimal"></label>
          <fieldset><legend>Uji cepat boraks dan formalin</legend>
            <label class="radio"><input type="radio" name="uji" value="negatif" checked> Negatif</label>
            <label class="radio"><input type="radio" name="uji" value="positif"> Positif, bahan ditolak</label></fieldset>
          <button class="btn btn-utama">Catat terima bahan</button></form>`;
      case "matang":
        return `<form class="form langkah-form" data-kunci="matang">
          <label>Suhu inti dengan termometer tusuk (°C)<input name="suhuInti" type="number" step="0.5" value="75" required inputmode="decimal"></label>
          <button class="btn btn-utama">Catat matang</button></form>`;
      case "kemas":
        return `<form class="form langkah-form" data-kunci="kemas">
          <p class="muted">Tarik sekat label pada ${b.boks} boks, tempel QR, lalu catat. Hitungan waktu label dimulai sekarang.</p>
          <button class="btn btn-utama">Aktifkan label dan catat</button></form>`;
      case "berangkat":
        return `<form class="form langkah-form" data-kunci="berangkat"><button class="btn btn-utama">Catat berangkat</button></form>`;
      case "tiba":
        return `<form class="form langkah-form" data-kunci="tiba"><button class="btn btn-utama">Catat tiba di sekolah</button></form>`;
      case "saji":
        return `<p class="muted">Dicatat guru di sekolah.</p><a class="btn btn-utama" href="#/guru/b/${b.id}">Buka gerbang saji</a>`;
    }
  }
  function detailEv(b, l) {
    const e = b.ev[l.kunci];
    if (!e) return "";
    const ex = [];
    if (l.kunci === "terima") ex.push(e.suhuBahan != null ? `bahan ${e.suhuBahan}°C` : "", e.uji === "positif" ? `<b class="t-tahan">uji cepat positif</b>` : "uji cepat negatif", e.catatan ? esc(e.catatan) : "");
    if (l.kunci === "matang") ex.push(e.suhuInti < S.C.SUHU_INTI_MIN ? `<b class="t-tahan">suhu inti ${e.suhuInti}°C</b>` : `suhu inti ${e.suhuInti}°C`);
    if (l.kunci === "kemas") ex.push("label aktif");
    if (l.kunci === "tiba" && e.otomatis) ex.push("dicatat saat guru memindai");
    if (l.kunci === "saji") ex.push(S.chipKep(e.keputusan), esc(e.oleh || ""));
    return `<span class="tabular">${S.fmtJam(e.t)}</span> ${ex.filter(Boolean).join(", ")}`;
  }
  function dapurDetail(id) {
    const b = S.batch(id);
    if (!b) return `<div class="kolom"><p class="kosong">Batch ${esc(id)} tidak ditemukan.</p><a class="btn" href="#/dapur">Kembali</a></div>`;
    const sp = S.sppg(b.sppgId);
    const berikut = S.langkahBerikut(b);
    const per = S.peringatan(b);
    return `
    <div class="kolom">
      <a class="kembali" href="#/dapur">Kembali ke daftar batch</a>
      <header class="batch-kepala">
        <div>
          <p class="muted">${esc(sp.nama)}, batch <span class="tabular">${esc(b.id)}</span></p>
          <h1>${esc(b.sekolah)}</h1>
          <p>${esc(b.menu)}</p>
          <p class="muted">${esc(b.kelompok)}, ${b.porsi} porsi dalam ${b.boks} boks</p>
        </div>
        <div class="batch-dial" data-live-dial="${b.id}" data-size="132" data-teks="jam">${S.dial(S.indeksLabel(b, S.now()), { size: 132 })}</div>
      </header>
      <dl class="fakta">
        <div><dt>Status label</dt><dd data-live-kelas="${b.id}">${S.chipKelas(S.kelasDariIndeks(S.indeksLabel(b, S.now())))}</dd></div>
        <div><dt>Jeda sejak matang</dt><dd class="tabular" data-live-jeda="${b.id}">${S.fmtDurasi(S.jedaJam(b, S.now()))}</dd></div>
        <div><dt>Suhu ruang distribusi</dt><dd><select id="suhu-ruang" aria-label="Suhu ruang selama distribusi">${[25, 27, 30, 32, 35].map((v) => `<option value="${v}" ${v === b.suhu ? "selected" : ""}>${v}°C</option>`).join("")}</select></dd></div>
      </dl>
      ${per.length ? `<ul class="peringatan-inline">${per.map((p) => `<li class="p-${p.level}">${esc(p.teks)}</li>`).join("")}</ul>` : ""}
      <h2>Jurnal titik kritis</h2>
      <ol class="jurnal">
        ${S.LANGKAH.map((l) => {
          const done = !!b.ev[l.kunci], now = berikut && berikut.kunci === l.kunci;
          return `<li class="${done ? "selesai" : now ? "aktif" : ""}">
            <div class="j-kepala"><strong>${esc(l.nama)}</strong><span class="muted">${esc(l.siapa)}</span></div>
            ${done ? `<div class="j-isi">${detailEv(b, l)}</div>` : now ? formLangkah(b, l) : ""}
          </li>`;
        }).join("")}
      </ol>
      ${b.ev.kemas ? `<section class="qr-blok"><div class="qr">${window.SaksiQR.svg(S.qrIsi(b.id))}</div><div><h2>QR batch</h2><p class="muted">Tempel di setiap boks bersama label. Guru memindainya sebelum membagikan makanan.</p><a class="btn" href="#/kartu/${b.id}">Buka kartu label</a></div></section>` : ""}
    </div>`;
  }

  // ================= GURU =================
  function semuaSekolah() {
    return S.daftarSppg().map((sp) => `<optgroup label="${esc(sp.nama)}">${sp.sekolah.map((s) => `<option ${s === pref.sekolah ? "selected" : ""}>${esc(s)}</option>`).join("")}</optgroup>`).join("");
  }
  function guru() {
    const masuk = S.batchHari(0).filter((b) => b.sekolah === pref.sekolah);
    const belum = masuk.filter((b) => !b.ev.saji), sudah = masuk.filter((b) => b.ev.saji);
    return `
    <div class="kolom">
      <header class="hal-kepala">
        <h1>Gerbang saji</h1>
        <label class="pilih"><span>Sekolah</span><select id="pilih-sekolah">${semuaSekolah()}</select></label>
      </header>
      <section class="pindai-blok">
        <button class="btn btn-utama btn-besar" id="btn-qr" type="button">Pindai QR batch</button>
        <div id="qr-area" hidden>
          <div class="kamera"><video id="qr-video" muted playsinline></video><div class="bidik bidik-qr" aria-hidden="true"></div></div>
          <p class="muted" id="qr-status" aria-live="polite">Arahkan kamera ke QR pada boks.</p>
          <button class="btn" id="btn-qr-tutup" type="button">Tutup kamera</button>
        </div>
        <p class="muted" id="qr-info"></p>
      </section>
      <section>
        <h2>Batch menuju sekolah ini</h2>
        ${belum.length ? `<ul class="daftar-batch">${belum.map((b) => barisBatch(b, "guru")).join("")}</ul>` : `<p class="kosong">Tidak ada batch yang menunggu. Pilih sekolah lain atau tunggu kiriman berikutnya.</p>`}
        ${sudah.length ? `<h2>Sudah diputuskan hari ini</h2><ul class="daftar-batch">${sudah.map((b) => barisBatch(b, "guru")).join("")}</ul>` : ""}
      </section>
    </div>`;
  }
  function guruBatch(id) {
    const b = S.batch(id);
    if (!b) return `<div class="kolom"><p class="kosong">Batch ${esc(id)} tidak ditemukan. Periksa QR atau pilih dari daftar.</p><a class="btn" href="#/guru">Kembali</a></div>`;
    const sp = S.sppg(b.sppgId);
    if (b.ev.saji) return hasilSaji(b);
    if (!b.ev.kemas) return `<div class="kolom"><a class="kembali" href="#/guru">Kembali</a><h1>${esc(b.sekolah)}</h1><p class="kosong">Label batch ini belum diaktifkan di dapur, jadi belum bisa diperiksa.</p></div>`;
    return `
    <div class="kolom">
      <a class="kembali" href="#/guru">Kembali</a>
      <p class="muted">${esc(sp.nama)}, batch <span class="tabular">${esc(b.id)}</span></p>
      <h1>${esc(b.menu)}</h1>
      <dl class="fakta">
        <div><dt>Matang pukul</dt><dd class="tabular">${b.ev.matang ? S.fmtJam(b.ev.matang.t) : "tidak tercatat"}</dd></div>
        <div><dt>Jeda sejak matang</dt><dd class="tabular" data-live-jeda="${b.id}">${S.fmtDurasi(S.jedaJam(b, S.now()))}</dd></div>
        <div><dt>Porsi</dt><dd>${b.porsi} porsi, ${b.boks} boks</dd></div>
      </dl>
      <section class="baca">
        <h2>Baca label</h2>
        <p class="muted">Posisikan lingkaran label di tengah bidikan, sejajar dengan kartu warna. Aplikasi membandingkan warnanya dengan putih kartu.</p>
        <div id="cam-area" hidden>
          <div class="kamera"><video id="cam-video" muted playsinline></video><div class="bidik" aria-hidden="true"><span></span></div></div>
          <div class="baris-btn"><button class="btn btn-utama" id="btn-ambil" type="button">Baca warna</button><button class="btn" id="btn-cam-tutup" type="button">Tutup kamera</button></div>
        </div>
        <div class="opsi-baca" id="opsi-baca">
          <button class="btn btn-utama" id="btn-cam" type="button">Buka kamera</button>
          <label class="btn" for="foto">Ambil atau unggah foto</label>
          <input id="foto" type="file" accept="image/*" capture="environment" hidden>
          <button class="btn" id="btn-sim" type="button">Label simulasi</button>
        </div>
        <details class="manual"><summary>Kamera tidak bisa dipakai? Pilih warna yang paling mirip</summary>
          <div class="swatch-pilih">${["aman", "segera", "tahan"].map((k) => `<button type="button" class="swatch" data-kelas="${k}" style="--c:${S.rgbHex(S.REF[k])}"><span></span>${esc(S.NAMA_KELAS[k])}</button>`).join("")}</div>
        </details>
        <p class="muted" id="baca-status" aria-live="polite"></p>
      </section>
      <section id="keputusan" aria-live="polite"></section>
    </div>`;
  }
  function kartuKeputusan(b, bacaan) {
    const jeda = S.jedaJam(b, S.now());
    const kep = S.putuskan(bacaan.kelas, jeda);
    const sumber = { kamera: "dibaca kamera", foto: "dibaca dari foto", simulasi: "label simulasi", manual: "dipilih manual oleh guru" }[bacaan.sumber];
    return `
      <div class="keputusan k-${kep.hasil}">
        <h2>${S.NAMA_KEP[kep.hasil]}</h2>
        <p>${S.SUB_KEP[kep.hasil]}</p>
      </div>
      <div class="bukti">
        <div class="bukti-item">
          <span class="sw" style="--c:${S.rgbHex(bacaan.rgb)}"></span>
          <div><strong>Warna label</strong><span>${esc(S.NAMA_KELAS[bacaan.kelas])}, ${sumber}${bacaan.sumber !== "manual" ? `, ${Math.round(bacaan.idx * 100)}% dari umur label` : ""}</span>
          ${bacaan.yakin === false ? `<span class="t-segera">Warna kurang cocok dengan skala label. Ulangi dengan cahaya lebih merata.</span>` : ""}</div>
        </div>
        <div class="bukti-item">
          <span class="jeda-bar" style="--p:${Math.min(100, ((jeda || 0) / 5) * 100)}%"><i style="left:${(S.C.WHO_JAM / 5) * 100}%"></i><i style="left:${(S.C.BGN_JAM / 5) * 100}%"></i></span>
          <div><strong>Jeda sejak matang</strong><span class="tabular">${S.fmtDurasi(jeda)} (batas WHO ${S.C.WHO_JAM} jam, BGN ${S.C.BGN_JAM} jam)</span></div>
        </div>
      </div>
      <p class="muted">Alasan: ${kep.alasan.map(esc).join("; ")}.</p>
      <div class="baris-btn">
        ${kep.hasil === "tahan"
          ? `<button class="btn btn-tahan" data-putus="tahan" type="button">Tahan dan laporkan ke SPPG</button>`
          : `<button class="btn btn-utama" data-putus="${kep.hasil}" type="button">Bagikan ke siswa</button><button class="btn" data-putus="tahan" type="button">Tahan saja</button>`}
      </div>`;
  }
  function hasilSaji(b) {
    const e = b.ev.saji;
    const r = b.bacaan[b.bacaan.length - 1];
    return `
    <div class="kolom">
      <a class="kembali" href="#/guru">Kembali</a>
      <p class="muted">Batch <span class="tabular">${esc(b.id)}</span>, ${esc(b.sekolah)}</p>
      <div class="keputusan k-${e.keputusan === "tahan" ? "tahan" : e.keputusan === "segera" ? "segera" : "bagikan"}">
        <h2>${e.keputusan === "tahan" ? "Batch ditahan" : "Batch dibagikan"}</h2>
        <p class="tabular">Tercatat pukul ${S.fmtJam(e.t)}.${e.keputusan === "tahan" ? " SPPG dan pengawas sudah menerima laporan." : ""}</p>
      </div>
      <dl class="fakta">
        <div><dt>Warna label saat diperiksa</dt><dd>${r ? S.chipKelas(r.kelas) : "tidak ada bacaan"}</dd></div>
        <div><dt>Jeda matang sampai saji</dt><dd class="tabular">${S.fmtDurasi(S.jedaJam(b, e.t))}</dd></div>
      </dl>
      ${b.laporan ? `<p class="muted">Alasan: ${b.laporan.alasan.map(esc).join("; ")}.</p>` : ""}
      <a class="btn" href="#/guru">Periksa batch lain</a>
    </div>`;
  }

  // ================= PENGAWAS =================
  function pengawas() {
    const hariIni = S.batchHari(0);
    const peringatan = S.semuaBatch().filter((b) => b.hari >= S.hariMulai(-2, S.now())).flatMap((b) => S.peringatan(b)).sort((a, b) => b.t - a.t);
    const skor = S.daftarSppg().map((sp) => ({ sp, r: S.skorRisiko(sp.id) })).sort((a, b) => b.r.total - a.r.total);
    const ditahan = hariIni.filter((b) => b.ev.saji && b.ev.saji.keputusan === "tahan").length;
    const merah = skor.filter((s) => s.r.kategori === "merah").length;
    const maxJeda = 8;
    return `
    <div class="lebar">
      <header class="hal-kepala">
        <h1>Dasbor pengawas</h1>
        <p class="muted">Provinsi Riau, 6 SPPG contoh. <span data-tgl></span>, pukul <span data-jam></span>.</p>
      </header>
      <dl class="ringkas">
        <div><dt>Batch hari ini</dt><dd class="tabular">${hariIni.length}</dd></div>
        <div><dt>Ditahan di sekolah hari ini</dt><dd class="tabular">${ditahan}</dd></div>
        <div><dt>SPPG perlu inspeksi 24 jam</dt><dd class="tabular t-tahan">${merah}</dd></div>
      </dl>
      <div class="grid-pengawas">
        <section>
          <h2>Skor risiko SPPG, 7 hari terakhir</h2>
          <table class="tabel-risiko">
            <thead><tr><th scope="col">SPPG</th><th scope="col">Skor</th><th scope="col">Tindak lanjut</th></tr></thead>
            <tbody>${skor.map(({ sp, r }) => `
              <tr>
                <td><a href="#/pengawas/${sp.id}">${esc(sp.nama)}</a><span class="muted">${esc(sp.wilayah)}${sp.slhs ? "" : ", SLHS diproses"}</span></td>
                <td><span class="skor skor-${r.kategori}"><span class="tabular">${r.total}</span><i style="--w:${r.total}%"></i></span></td>
                <td>${r.kategori === "merah" ? S.chip("tahan", "Inspeksi maks. 24 jam") : r.kategori === "kuning" ? S.chip("segera", "Pembinaan") : S.chip("aman", "Rutin")}</td>
              </tr>`).join("")}</tbody>
          </table>
          <h2>Rata-rata jeda matang sampai saji</h2>
          <figure class="chart" role="img" aria-label="Grafik rata-rata jeda matang sampai saji per SPPG">
            ${skor.map(({ sp, r }) => `<div class="c-baris"><span>${esc(sp.nama.replace("SPPG ", ""))}</span><span class="c-bar"><b class="${r.rinci.jeda > S.C.BGN_JAM ? "b-tahan" : r.rinci.jeda > S.C.WHO_JAM ? "b-segera" : "b-aman"}" style="width:${(r.rinci.jeda / maxJeda) * 100}%"></b></span><span class="tabular">${r.rinci.jeda.toFixed(1)} j</span></div>`).join("")}
            <div class="c-ambang" aria-hidden="true"><i style="left:${(S.C.WHO_JAM / maxJeda) * 100}%">WHO 2 j</i><i style="left:${(S.C.BGN_JAM / maxJeda) * 100}%">BGN 4 j</i></div>
          </figure>
        </section>
        <aside>
          <h2>Peringatan terbaru</h2>
          ${peringatan.length ? `<ul class="feed">${peringatan.slice(0, 12).map((p) => `<li class="p-${p.level}"><span class="tabular muted">${S.fmtTgl(p.t).split(",")[1].trim()} ${S.fmtJam(p.t)}</span><strong>${esc(p.sppg)}</strong><span>${esc(p.teks)}</span></li>`).join("")}</ul>` : `<p class="kosong">Tidak ada peringatan dalam tiga hari terakhir.</p>`}
        </aside>
      </div>
    </div>`;
  }
  function pengawasSppg(id) {
    const sp = S.sppg(id);
    if (!sp) return `<div class="lebar"><p class="kosong">SPPG tidak ditemukan.</p></div>`;
    const r = S.skorRisiko(id);
    const bs = S.batchSppg(id, S.hariMulai(-7, S.now())).filter((b) => b.ev.saji).sort((a, b) => b.ev.saji.t - a.ev.saji.t);
    const komp = [
      ["label", "Label kuning atau batch ditahan", 35, `${Math.round(r.rinci.kuning * 100)}% batch`],
      ["jurnal", "Kelengkapan jurnal titik kritis", 25, `${Math.round(r.rinci.lengkap * 100)}% titik tercatat`],
      ["jeda", "Rata-rata jeda matang sampai saji", 20, S.fmtDurasi(r.rinci.jeda)],
      ["slhs", "Status SLHS", 10, sp.slhs ? "Bersertifikat" : "Masih diproses"],
      ["insiden", "Insiden 90 hari terakhir", 10, `${sp.insiden90} kejadian`],
    ];
    return `
    <div class="lebar">
      <a class="kembali" href="#/pengawas">Kembali ke dasbor</a>
      <header class="hal-kepala"><h1>${esc(sp.nama)}</h1><p class="muted">${esc(sp.wilayah)}. Skor risiko <b class="tabular">${r.total}</b> dari 100.</p></header>
      <div class="grid-pengawas">
        <section>
          <h2>Rincian skor</h2>
          <table class="tabel-risiko"><thead><tr><th scope="col">Komponen</th><th scope="col">Nilai</th><th scope="col">Poin</th></tr></thead>
          <tbody>${komp.map(([k, n, max, v]) => `<tr><td>${esc(n)}<span class="muted">bobot ${max}%</span></td><td>${esc(v)}</td><td><span class="skor skor-${r.k[k] / max > 0.66 ? "merah" : r.k[k] / max > 0.33 ? "kuning" : "hijau"}"><span class="tabular">${r.k[k].toFixed(0)}/${max}</span><i style="--w:${(r.k[k] / max) * 100}%"></i></span></td></tr>`).join("")}</tbody></table>
        </section>
        <aside>
          <h2>Batch 7 hari terakhir</h2>
          <ul class="feed">${bs.slice(0, 21).map((b) => `<li class="p-${b.ev.saji.keputusan === "tahan" ? "tahan" : b.ev.saji.keputusan === "segera" ? "segera" : "aman"}"><span class="tabular muted">${S.fmtTgl(b.ev.saji.t).split(",")[1].trim()} ${S.fmtJam(b.ev.saji.t)}</span><strong>${esc(b.sekolah)}</strong><span>Jeda ${S.fmtDurasi(S.jedaJam(b, b.ev.saji.t))}, ${b.ev.saji.keputusan === "tahan" ? "ditahan" : "dibagikan"}</span></li>`).join("")}</ul>
        </aside>
      </div>
    </div>`;
  }

  // ================= KARTU LABEL =================
  function kartu(id) {
    const b = S.batch(id);
    if (!b) return `<div class="kolom"><p class="kosong">Batch tidak ditemukan.</p></div>`;
    const idx = S.indeksLabel(b, S.now());
    return `
    <div class="kolom kartu-hal">
      <a class="kembali no-print" href="#/dapur/b/${b.id}">Kembali ke batch</a>
      <p class="muted no-print">Kartu ini meniru label fisik. Tampilkan di layar lain dengan kecerahan penuh atau cetak, lalu pindai dari mode Guru. Warna lingkaran mengikuti jam simulasi.</p>
      <article class="kartu" aria-label="Kartu label batch ${esc(b.id)}">
        <div class="kartu-label">
          <div class="kartu-ref">${["aman", "segera", "tahan"].map((k) => `<span style="background:${S.rgbHex(S.REF[k])}" title="${esc(S.NAMA_KELAS[k])}"></span>`).join("")}</div>
          <div class="kartu-lingkar" id="kartu-lingkar" style="background:${idx == null ? "#eee" : S.rgbHex(S.warnaPada(idx))}"></div>
        </div>
        <div class="kartu-qr">${window.SaksiQR.svg(S.qrIsi(b.id), { margin: 1 })}</div>
        <div class="kartu-teks">
          <strong>SAKSI</strong>
          <span class="tabular">${esc(b.id)}</span>
          <span>${esc(b.sekolah)}</span>
          <span>Label aktif ${b.ev.kemas ? S.fmtJam(b.ev.kemas.t) : "belum"}</span>
        </div>
      </article>
      <div class="baris-btn no-print"><button class="btn" type="button" onclick="window.print()">Cetak kartu</button><a class="btn" href="#/guru/b/${b.id}">Periksa sebagai guru</a></div>
    </div>`;
  }

  // ================= ROUTER =================
  const routes = [
    [/^#?\/?$/, beranda, mulaiDemoDial],
    [/^#\/dapur$/, dapur, mountDapur],
    [/^#\/dapur\/baru$/, dapurBaru, mountBaru],
    [/^#\/dapur\/b\/([\w-]+)$/, dapurDetail, mountDetail],
    [/^#\/guru$/, guru, mountGuru],
    [/^#\/guru\/b\/([\w-]+)$/, guruBatch, mountGuruBatch],
    [/^#\/pengawas$/, pengawas],
    [/^#\/pengawas\/([\w-]+)$/, pengawasSppg],
    [/^#\/kartu\/([\w-]+)$/, kartu, mountKartu],
  ];
  function render() {
    S.kamera.berhenti();
    const h = location.hash || "#/";
    for (const [re, view, mount] of routes) {
      const m = re.exec(h);
      if (m) {
        app.innerHTML = view(m[1]);
        document.querySelectorAll(".nav a").forEach((a) => a.setAttribute("aria-current", h.startsWith(a.getAttribute("href")) ? "page" : "false"));
        if (mount) mount(m[1]);
        S.tick();
        const h1 = app.querySelector("h1");
        if (h1 && render.pertama) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
        render.pertama = true;
        window.scrollTo(0, 0);
        return;
      }
    }
    app.innerHTML = `<div class="kolom"><p class="kosong">Halaman tidak ditemukan.</p><a class="btn" href="#/">Ke beranda</a></div>`;
  }

  // ---------- mount handlers ----------
  function mountDapur() {
    $("#pilih-sppg").addEventListener("change", (e) => { pref.sppg = e.target.value; simpanPref(); render(); });
  }
  function mountBaru() {
    const f = $("#form-baru");
    const upd = () => { const n = +f.porsi.value || 0; $("#info-boks").textContent = `${Math.ceil(n / S.C.OMPRENG_PER_BOKS)} boks distribusi, satu label per boks.`; };
    f.porsi.addEventListener("input", upd); upd();
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const b = S.buatBatchBaru({ sppgId: pref.sppg, sekolah: f.sekolah.value, menu: f.menu.value, porsi: +f.porsi.value });
      go(`#/dapur/b/${b.id}`);
    });
  }
  function mountDetail(id) {
    const sel = $("#suhu-ruang");
    if (sel) sel.addEventListener("change", (e) => { S.aturSuhu(id, +e.target.value); S.tick(); });
    app.querySelectorAll(".langkah-form").forEach((f) =>
      f.addEventListener("submit", (e) => {
        e.preventDefault();
        const k = f.dataset.kunci, d = {};
        if (k === "terima") { d.suhuBahan = +f.suhuBahan.value; d.uji = f.uji.value; if (d.uji === "positif") d.catatan = "Uji cepat positif, bahan ditolak"; }
        if (k === "matang") d.suhuInti = +f.suhuInti.value;
        S.catat(id, k, d);
        render();
      })
    );
  }
  function mountGuru() {
    $("#pilih-sekolah").addEventListener("change", (e) => { pref.sekolah = e.target.value; simpanPref(); render(); });
    const info = $("#qr-info");
    $("#btn-qr").addEventListener("click", async () => {
      if (!S.kamera.adaKamera()) { info.textContent = "Kamera tidak tersedia di perangkat ini. Pilih batch dari daftar di bawah."; return; }
      if (!S.kamera.adaQR()) { info.textContent = "Peramban ini belum mendukung pemindai QR otomatis (gunakan Chrome di Android). Pilih batch dari daftar di bawah."; return; }
      $("#qr-area").hidden = false; $("#btn-qr").hidden = true;
      try {
        const v = $("#qr-video");
        await S.kamera.mulai(v);
        const onQR = (teks) => {
          const id = S.qrBaca(teks);
          if (id && S.batch(id)) return go(`#/guru/b/${id}`);
          $("#qr-status").textContent = "QR ini bukan QR batch SAKSI. Arahkan ke QR pada label boks.";
          S.kamera.mulai(v).then(() => S.kamera.pindaiQR(v, onQR));
        };
        S.kamera.pindaiQR(v, onQR);
      } catch (e) {
        $("#qr-area").hidden = true; $("#btn-qr").hidden = false;
        info.textContent = "Izin kamera ditolak atau kamera sedang dipakai aplikasi lain. Pilih batch dari daftar di bawah.";
      }
    });
    $("#btn-qr-tutup").addEventListener("click", () => { S.kamera.berhenti(); $("#qr-area").hidden = true; $("#btn-qr").hidden = false; });
  }
  function mountGuruBatch(id) {
    const b = S.batch(id);
    if (!b || b.ev.saji || !b.ev.kemas) return;
    const status = $("#baca-status"), out = $("#keputusan");
    let bacaanTerakhir = null;
    const tampil = (bacaan) => {
      bacaanTerakhir = bacaan;
      S.simpanBacaan(id, { sumber: bacaan.sumber, rgb: bacaan.rgb, idx: +bacaan.idx.toFixed(2), kelas: bacaan.kelas });
      out.innerHTML = kartuKeputusan(b, bacaan);
      out.querySelectorAll("[data-putus]").forEach((btn) =>
        btn.addEventListener("click", () => {
          const kep = btn.dataset.putus;
          const alasan = kep === "tahan" ? S.putuskan(bacaanTerakhir.kelas, S.jedaJam(b, S.now())).alasan.concat(btn.textContent.trim() === "Tahan saja" ? ["Ditahan atas pertimbangan guru"] : []) : [];
          S.putuskanSaji(id, kep, alasan, "Guru " + b.sekolah);
          render();
        })
      );
      out.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    };
    const dariRgb = (rgb, sumber, extra = {}) => { const r = S.bacaWarna(rgb); tampil({ sumber, rgb, ...r, ...extra }); };

    $("#btn-cam").addEventListener("click", async () => {
      if (!S.kamera.adaKamera()) { status.textContent = "Kamera tidak tersedia. Gunakan foto, label simulasi, atau pilih warna manual."; return; }
      try {
        await S.kamera.mulai($("#cam-video"));
        $("#cam-area").hidden = false; $("#opsi-baca").hidden = true; status.textContent = "";
      } catch (e) { status.textContent = "Izin kamera ditolak. Gunakan foto, label simulasi, atau pilih warna manual."; }
    });
    $("#btn-cam-tutup").addEventListener("click", () => { S.kamera.berhenti(); $("#cam-area").hidden = true; $("#opsi-baca").hidden = false; });
    $("#btn-ambil").addEventListener("click", () => {
      const s = S.kamera.sampel($("#cam-video"));
      S.kamera.berhenti(); $("#cam-area").hidden = true; $("#opsi-baca").hidden = false;
      status.textContent = s.koreksi ? "Warna dikoreksi terhadap putih kartu." : "Putih kartu tidak terbaca, warna dipakai tanpa koreksi.";
      dariRgb(s.rgb, "kamera");
    });
    $("#foto").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => { const s = S.kamera.sampel(img); URL.revokeObjectURL(img.src); status.textContent = s.koreksi ? "Warna dikoreksi terhadap putih kartu." : "Putih kartu tidak terbaca, warna dipakai tanpa koreksi."; dariRgb(s.rgb, "foto"); };
      img.onerror = () => (status.textContent = "Foto tidak bisa dibaca. Coba foto lain.");
      img.src = URL.createObjectURL(file);
    });
    $("#btn-sim").addEventListener("click", () => {
      const idx = S.indeksLabel(b, S.now());
      status.textContent = "Memakai warna label simulasi sesuai jam saat ini.";
      tampil({ sumber: "simulasi", rgb: S.warnaPada(idx), idx, kelas: S.kelasDariIndeks(idx), yakin: true });
    });
    app.querySelectorAll(".swatch").forEach((btn) =>
      btn.addEventListener("click", () => {
        const k = btn.dataset.kelas, idx = { aman: 0.2, segera: 0.75, tahan: 1.12 }[k];
        status.textContent = "Warna dipilih manual. Bacaan ditandai sebagai manual di laporan.";
        tampil({ sumber: "manual", rgb: S.REF[k], idx, kelas: k, yakin: true });
      })
    );
  }
  function mountKartu(id) {
    const el = $("#kartu-lingkar");
    const b = S.batch(id);
    const upd = () => { if (!document.body.contains(el)) return clearInterval(tm); const i = S.indeksLabel(b, S.now()); if (i != null) el.style.background = S.rgbHex(S.warnaPada(i)); };
    const tm = setInterval(upd, 1000);
  }

  // ---------- jam simulasi ----------
  function initJam() {
    const btn = $("#btn-jam"), panel = $("#jam-panel");
    const sync = () => {
      panel.querySelectorAll("[data-laju]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.laju === S.laju())));
      $("#jam-laju").textContent = S.laju() === 1 ? "" : `${S.laju()}x`;
    };
    btn.addEventListener("click", () => { const open = panel.hidden; panel.hidden = !open; btn.setAttribute("aria-expanded", String(open)); sync(); });
    panel.addEventListener("click", (e) => {
      const t = e.target.closest("button");
      if (!t) return;
      if (t.dataset.laju) { S.aturLaju(+t.dataset.laju); sync(); }
      if (t.dataset.maju) { S.majukan(+t.dataset.maju); render(); }
      if (t.id === "btn-reset") { S.atur_ulang(); render(); sync(); }
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); btn.focus(); } });
    sync();
  }

  window.addEventListener("hashchange", render);
  initJam();
  render();
  setInterval(S.tick, 1000);
})();
