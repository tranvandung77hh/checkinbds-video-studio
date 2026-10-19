/* Check in BDS Video Studio — phòng dựng video trên điện thoại
   Dựng video thật từ ảnh tài sản: vẽ từng khung lên canvas rồi ghi lại bằng MediaRecorder.
   Không cần máy chủ, không tốn API. Video và nhạc lưu trong IndexedDB của máy anh.
   Màu, chữ, cảnh cuối theo Brand Guideline Check in BDS. */
(function (global) {
  "use strict";

  var C = null;                         // các hàm dùng chung từ app.js (window.CIB)
  var DO = "#8B0E1A", DO_DAM = "#6E0A14", VANG = "#D4A017", TRANG = "#FFFFFF";
  var FONT = "Montserrat, 'Segoe UI', Arial, sans-serif";

  /* ================= kho video ================= */
  var TEN_DB = "cibds-video", db = null, BAN = [];

  function mo() {
    return new Promise(function (ok, loi) {
      if (db) return ok(db);
      if (!global.indexedDB) return loi(new Error("Máy không hỗ trợ lưu video"));
      var r = indexedDB.open(TEN_DB, 1);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta", { keyPath: "id" });
        if (!d.objectStoreNames.contains("file")) d.createObjectStore("file", { keyPath: "id" });
        if (!d.objectStoreNames.contains("am")) d.createObjectStore("am", { keyPath: "ts" });
      };
      r.onsuccess = function () { db = r.result; ok(db); };
      r.onerror = function () { loi(r.error); };
    });
  }
  function chay(req) {
    return new Promise(function (ok, loi) {
      req.onsuccess = function () { ok(req.result); };
      req.onerror = function () { loi(req.error); };
    });
  }
  function tx(ten, che) { return mo().then(function (d) { return d.transaction(ten, che); }); }
  function xong(t) {
    return new Promise(function (ok, loi) {
      t.oncomplete = function () { ok(); };
      t.onerror = function () { loi(t.error); };
      t.onabort = function () { loi(t.error || new Error("Máy hết dung lượng")); };
    });
  }

  function napBan() {
    return tx("meta", "readonly").then(function (t) { return chay(t.objectStore("meta").getAll()); })
      .then(function (ds) { BAN = ds || []; return BAN; })
      .catch(function () { BAN = []; return BAN; });
  }
  function banCua(ts) {
    return BAN.filter(function (b) { return b.ts === ts; }).sort(function (a, b) { return b.tao - a.tao; });
  }
  function luuBan(meta, blob, thumb) {
    return tx(["meta", "file"], "readwrite").then(function (t) {
      t.objectStore("meta").put(meta);
      t.objectStore("file").put({ id: meta.id, blob: blob, thumb: thumb });
      return xong(t).then(function () { BAN.push(meta); return meta; });
    });
  }
  function suaBan(meta) {
    return tx("meta", "readwrite").then(function (t) { t.objectStore("meta").put(meta); return xong(t); });
  }
  function xoaBan(id) {
    return tx(["meta", "file"], "readwrite").then(function (t) {
      t.objectStore("meta").delete(id);
      t.objectStore("file").delete(id);
      return xong(t).then(function () {
        BAN = BAN.filter(function (b) { return b.id !== id; });
        if (URL_BAN[id]) { URL.revokeObjectURL(URL_BAN[id]); delete URL_BAN[id]; }
        if (URL_THUMB[id]) { URL.revokeObjectURL(URL_THUMB[id]); delete URL_THUMB[id]; }
      });
    });
  }
  function layBan(id) {
    return tx("file", "readonly").then(function (t) { return chay(t.objectStore("file").get(id)); });
  }
  function luuAm(ts, blob, ten) {
    return tx("am", "readwrite").then(function (t) {
      t.objectStore("am").put({ ts: ts, blob: blob, ten: ten, tao: Date.now() });
      return xong(t);
    });
  }
  function layAm(ts) {
    return tx("am", "readonly").then(function (t) { return chay(t.objectStore("am").get(ts)); }).catch(function () { return null; });
  }
  function xoaAm(ts) {
    return tx("am", "readwrite").then(function (t) { t.objectStore("am").delete(ts); return xong(t); });
  }
  var URL_BAN = {}, URL_THUMB = {};

  /* ================= cài đặt dựng ================= */
  var KHUNG = {
    doc: { ten: "Dọc 9:16", phu: "TikTok · Reels · Shorts", w: 1080, h: 1920 },
    vuong: { ten: "Vuông 1:1", phu: "Facebook", w: 1080, h: 1080 },
    ngang: { ten: "Ngang 16:9", phu: "YouTube", w: 1920, h: 1080 }
  };
  var MAC = {
    khung: "doc", chatLuong: "1080", giayAnh: 3.5, chuyenDong: "zoom", chuyenCanh: "mo",
    coPhuDe: true, coSo: true, coCuoi: true, coLogo: true, coChu: "vua", viTri: "duoi",
    amLuong: 0.8, hook: null, phuDe: {}, anh: null, mau: "sang"
  };
  var MAU = {
    sang: { ten: "Sang trọng", mo: "Chậm, zoom nhẹ, mờ dần", giayAnh: 4.5, chuyenDong: "zoom", chuyenCanh: "mo", coChu: "vua", viTri: "duoi", coPhuDe: true },
    nhanh: { ten: "Nhanh — TikTok", mo: "Nhịp nhanh, lia ảnh, chữ to", giayAnh: 2, chuyenDong: "lia", chuyenCanh: "cat", coChu: "lon", viTri: "giua", coPhuDe: true },
    toigian: { ten: "Tối giản", mo: "Ảnh đứng yên, ít chữ", giayAnh: 3.5, chuyenDong: "tinh", chuyenCanh: "mo", coChu: "nho", viTri: "duoi", coPhuDe: false }
  };
  var TEN_DONG = { zoom: "Zoom chậm", lia: "Lia ngang", tinh: "Đứng yên" };
  var TEN_CANH = { mo: "Mờ dần", cat: "Cắt thẳng", truot: "Trượt" };

  function caiCua(it) {
    var c = JSON.parse(JSON.stringify(MAC));
    var v = it.video || {};
    Object.keys(v).forEach(function (k) { c[k] = v[k]; });
    if (!c.phuDe) c.phuDe = {};
    return c;
  }
  function luuCai(it, cai) {
    it.video = cai;
    it.sua = Date.now();
    C.ghiHoan();
  }

  function kichThuoc(cai, xem) {
    var k = KHUNG[cai.khung] || KHUNG.doc;
    var s = xem ? 0.5 : (cai.chatLuong === "720" ? 2 / 3 : 1);
    return { w: Math.round(k.w * s / 2) * 2, h: Math.round(k.h * s / 2) * 2 };
  }

  /* chữ gợi ý — chỉ dùng số liệu anh đã nhập, không thêm thắt */
  function phuDeGoiY(c) {
    var L = [];
    var kc = [c.dt > 0 ? C.f0(c.dt) + " m²" : "", c.tang > 0 ? c.tang + " tầng" : "", c.pn > 0 ? c.pn + " phòng ngủ" : ""].filter(Boolean);
    if (kc.length) L.push(kc.join(" · "));
    L.push("Hướng " + c.huong + " · " + c.pl.ngan);
    if (c.coGia) L.push("Giá thị trường " + C.f1(c.tt) + " tỷ · chủ bán " + C.f1(c.gia) + " tỷ");
    if (c.coThue) L.push("Cho thuê " + C.f0(c.thue) + " triệu/tháng");
    if (c.khu) L.push(c.loai + " " + c.khu);
    L.push("Hợp với " + c.kh.ten.toLowerCase());
    return L;
  }
  function hookGoiY(c) {
    if (c.coGia && c.mos > 0) return "Thấp hơn giá thị trường " + C.f1(c.chenh) + " tỷ";
    return c.loai + " " + c.dc;
  }

  /* ================= dòng thời gian ================= */
  function dsAnh(it, cai) {
    var tatCa = global.Anh ? Anh.cua(it.id).map(function (m) { return m.id; }) : [];
    var ds;
    if (Array.isArray(cai.anh)) {
      ds = cai.anh.filter(function (id) { return tatCa.indexOf(id) >= 0; });
    } else {
      ds = tatCa.slice();
      if (it.anhBia && ds.indexOf(it.anhBia) > 0) { ds.splice(ds.indexOf(it.anhBia), 1); ds.unshift(it.anhBia); }
    }
    return { dung: ds, boRa: tatCa.filter(function (id) { return ds.indexOf(id) < 0; }) };
  }

  function keHoach(it, c, cai) {
    var ds = dsAnh(it, cai).dung;
    var goi = phuDeGoiY(c);
    var T = cai.chuyenCanh === "cat" ? 0 : 0.6;
    var cs = [];
    cs.push({ loai: "mo", anh: ds[0] || null, dur: Math.max(3, +cai.giayAnh), so: 0 });
    ds.slice(1).forEach(function (id, i) {
      var chu = cai.phuDe[id] != null ? cai.phuDe[id] : (goi[i] || "");
      cs.push({ loai: "anh", anh: id, dur: +cai.giayAnh, chu: cai.coPhuDe ? chu : "", so: i + 1 });
    });
    if (cai.coSo && c.coGia) cs.push({ loai: "so", dur: 4 });
    if (cai.coCuoi) cs.push({ loai: "cuoi", dur: 3.2 });
    var bd = 0;
    cs.forEach(function (s) { s.bd = bd; s.kt = bd + s.dur; bd = s.kt - T; });
    return {
      canh: cs, T: T, tong: cs[cs.length - 1].kt, cai: cai, c: c,
      hook: cai.hook != null ? cai.hook : hookGoiY(c),
      dong2: [c.loai, c.dc, c.khu].filter(Boolean).join(" · ")
    };
  }

  /* ================= ảnh đã giải mã (giữ tối đa 4 tấm trong bộ nhớ) ================= */
  var BMP = {}, LRU = [];
  function giaiMa(id) {
    if (BMP[id]) { LRU = LRU.filter(function (x) { return x !== id; }); LRU.push(id); return BMP[id].p; }
    var o = { b: null };
    o.p = Anh.layFile(id).then(function (f) {
      if (!f || !f.goc) return null;
      if (global.createImageBitmap) {
        return createImageBitmap(f.goc, { imageOrientation: "from-image" }).catch(function () { return createImageBitmap(f.goc); });
      }
      return new Promise(function (ok) {
        var img = new Image();
        img.onload = function () { ok(img); };
        img.onerror = function () { ok(null); };
        img.src = URL.createObjectURL(f.goc);
      });
    }).then(function (b) { o.b = b; return b; }).catch(function () { return null; });
    BMP[id] = o;
    LRU.push(id);
    while (LRU.length > 4) {
      var bo = LRU.shift();
      if (BMP[bo] && BMP[bo].b && BMP[bo].b.close) BMP[bo].b.close();
      delete BMP[bo];
    }
    return o.p;
  }
  function bmp(id) {
    if (!id) return null;
    if (!BMP[id]) giaiMa(id);
    return BMP[id] ? BMP[id].b : null;
  }
  function chuanBi(kh, t, xa) {
    kh.canh.forEach(function (s) {
      if (s.anh && s.kt > t && s.bd < t + (xa || 3)) giaiMa(s.anh);
    });
  }
  function choAnhDau(kh) {
    var can = kh.canh.filter(function (s) { return s.anh; }).slice(0, 2).map(function (s) { return giaiMa(s.anh); });
    return Promise.all(can);
  }

  /* ================= vẽ ================= */
  function kep(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  function emDau(x) { return x * x * (3 - 2 * x); }
  function raNhanh(x) { return 1 - Math.pow(1 - x, 3); }
  function f(w, px) { return w + " " + Math.round(px) + "px " + FONT; }

  function catDong(ctx, chu, rong) {
    var tu = String(chu || "").split(/\s+/).filter(Boolean), dong = [], d = "";
    tu.forEach(function (w) {
      var thu = d ? d + " " + w : w;
      if (ctx.measureText(thu).width <= rong || !d) d = thu;
      else { dong.push(d); d = w; }
    });
    if (d) dong.push(d);
    return dong;
  }

  function hcnTron(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function veAnh(ctx, W, H, b, p, kieu, so) {
    if (!b) { ctx.fillStyle = DO_DAM; ctx.fillRect(0, 0, W, H); return; }
    var iw = b.width, ih = b.height;
    var s0 = Math.max(W / iw, H / ih);
    var q = emDau(kep(p)), z = 1, x, y, dw, dh;
    if (kieu === "zoom") {
      z = so % 2 === 0 ? 1 + 0.1 * q : 1.1 - 0.1 * q;
      dw = iw * s0 * z; dh = ih * s0 * z;
      var lechX = (so % 3 - 1) * 0.04 * W * q;
      x = (W - dw) / 2 + lechX; y = (H - dh) / 2;
    } else if (kieu === "lia") {
      z = 1.06;
      dw = iw * s0 * z; dh = ih * s0 * z;
      var duX = dw - W, duY = dh - H, chieu = so % 2 === 0 ? 1 : -1;
      if (duX >= duY) { x = chieu > 0 ? -duX * q : -duX * (1 - q); y = (H - dh) / 2; }
      else { y = chieu > 0 ? -duY * q : -duY * (1 - q); x = (W - dw) / 2; }
    } else {
      dw = iw * s0; dh = ih * s0;
      x = (W - dw) / 2; y = (H - dh) / 2;
    }
    ctx.drawImage(b, x, y, dw, dh);
  }

  function veBieuTuong(ctx, x, y, s, mau) {
    // skyline + đường sóng — giống icon app
    ctx.save();
    ctx.fillStyle = mau; ctx.strokeStyle = mau;
    var cot = [[0.06, 0.38, 0.17], [0.27, 0.2, 0.19], [0.5, 0.31, 0.15], [0.69, 0.1, 0.25]];
    cot.forEach(function (k) { ctx.fillRect(x + k[0] * s, y + k[1] * s, k[2] * s, (0.72 - k[1]) * s); });
    ctx.lineWidth = Math.max(2, 0.07 * s);
    ctx.lineCap = "round";
    ctx.beginPath();
    for (var i = 0; i <= 24; i++) {
      var t = i / 24, px = x + 0.06 * s + t * 0.88 * s, py = y + 0.86 * s + Math.sin(t * Math.PI * 2) * 0.06 * s;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }

  function veLogo(ctx, W, H, u, doc) {
    var s = 74 * u, pad = 40 * u;
    var x = W - pad - s, y = doc ? H * 0.065 : pad;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 14 * u;
    ctx.strokeStyle = VANG; ctx.lineWidth = 3.5 * u;
    hcnTron(ctx, x, y, s, s, 12 * u); ctx.stroke();
    ctx.shadowBlur = 0;
    veBieuTuong(ctx, x + s * 0.14, y + s * 0.12, s * 0.72, VANG);
    ctx.shadowBlur = 14 * u;
    ctx.fillStyle = TRANG; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.font = f(800, 26 * u);
    ctx.fillText("CHECK IN BDS", x - 16 * u, y + s * 0.38);
    ctx.fillStyle = VANG; ctx.font = f(600, 20 * u);
    ctx.fillText("0983.221911", x - 16 * u, y + s * 0.7);
    ctx.restore();
  }

  function vePhuDe(ctx, W, H, u, chu, cai, p) {
    if (!chu) return;
    var co = { nho: 40, vua: 50, lon: 64 }[cai.coChu] || 50;
    var size = co * u;
    ctx.save();
    ctx.font = f(700, size);
    var maxW = W - 140 * u;
    var dong = catDong(ctx, chu, maxW - 56 * u).slice(0, 3);
    var lh = size * 1.28, bh = dong.length * lh + 44 * u;
    var bw = Math.min(maxW, Math.max.apply(null, dong.map(function (d) { return ctx.measureText(d).width; })) + 64 * u);
    var doc = H > W;
    var y = cai.viTri === "tren" ? (doc ? H * 0.17 : 110 * u)
      : cai.viTri === "giua" ? (H - bh) / 2
      : H - bh - (doc ? H * 0.2 : 90 * u);
    var x = (W - bw) / 2;
    var vao = raNhanh(kep(p / 0.12));
    ctx.globalAlpha *= vao;
    y += (1 - vao) * 24 * u;
    ctx.fillStyle = "rgba(139,14,26,0.9)";
    hcnTron(ctx, x, y, bw, bh, 16 * u); ctx.fill();
    ctx.fillStyle = VANG;
    ctx.fillRect(x + 24 * u, y, bw - 48 * u, 5 * u);
    ctx.fillStyle = TRANG; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    dong.forEach(function (d, i) { ctx.fillText(d, W / 2, y + 22 * u + lh * (i + 0.5)); });
    ctx.restore();
  }

  function veMo(ctx, W, H, u, s, p, kh) {
    veAnh(ctx, W, H, bmp(s.anh), p, kh.cai.chuyenDong, 0);
    var doc = H > W;
    var g = ctx.createLinearGradient(0, 0, 0, H * 0.62);
    g.addColorStop(0, "rgba(20,4,6,0.82)"); g.addColorStop(0.55, "rgba(20,4,6,0.45)"); g.addColorStop(1, "rgba(20,4,6,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.62);
    var size = (doc ? 86 : 72) * u;
    ctx.save();
    ctx.font = f(800, size);
    var dong = catDong(ctx, String(kh.hook || "").toUpperCase(), W - 130 * u).slice(0, 4);
    var y0 = doc ? H * 0.17 : 150 * u, lh = size * 1.12;
    var vao = raNhanh(kep(p / 0.18));
    ctx.globalAlpha *= vao;
    ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 18 * u;
    ctx.fillStyle = VANG; ctx.textAlign = "left"; ctx.textBaseline = "top";
    dong.forEach(function (d, i) { ctx.fillText(d, 65 * u, y0 + i * lh + (1 - vao) * 30 * u); });
    ctx.fillStyle = TRANG; ctx.font = f(600, 38 * u);
    var d2 = catDong(ctx, kh.dong2, W - 130 * u).slice(0, 2);
    d2.forEach(function (d, i) { ctx.fillText(d, 65 * u, y0 + dong.length * lh + 24 * u + i * 48 * u); });
    ctx.restore();
    if (kh.cai.coLogo) veLogo(ctx, W, H, u, doc);
  }

  function veAnhCanh(ctx, W, H, u, s, p, kh) {
    veAnh(ctx, W, H, bmp(s.anh), p, kh.cai.chuyenDong, s.so);
    vePhuDe(ctx, W, H, u, s.chu, kh.cai, p);
    if (kh.cai.coLogo) veLogo(ctx, W, H, u, H > W);
  }

  function veSo(ctx, W, H, u, s, p, kh) {
    var c = kh.c;
    ctx.fillStyle = DO; ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W / 2, H * 0.35, 10, W / 2, H * 0.35, Math.max(W, H) * 0.7);
    g.addColorStop(0, "rgba(255,255,255,0.07)"); g.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    var a = raNhanh(kep(p / 0.15));
    ctx.globalAlpha *= a;
    ctx.fillStyle = VANG; ctx.font = f(700, 34 * u);
    ctx.fillText("BIÊN AN TOÀN · MoS", W / 2, H * 0.17);
    var dem = raNhanh(kep(p / 0.45));
    ctx.font = f(800, 210 * u);
    ctx.fillText(C.f1(c.mos * dem) + "%", W / 2, H * 0.17 + 230 * u);
    // nhãn
    ctx.font = f(700, 30 * u);
    var nhan = c.nhan.toUpperCase(), nw = ctx.measureText(nhan).width + 56 * u, ny = H * 0.17 + 280 * u;
    ctx.fillStyle = VANG; hcnTron(ctx, (W - nw) / 2, ny, nw, 58 * u, 29 * u); ctx.fill();
    ctx.fillStyle = "#2B1A00"; ctx.textBaseline = "middle";
    ctx.fillText(nhan, W / 2, ny + 30 * u);
    // bảng số
    var hang = [["Giá thị trường", C.f1(c.tt) + " tỷ"], ["Giá chủ bán", C.f1(c.gia) + " tỷ"], ["Chênh lệch", C.f1(c.chenh) + " tỷ"]];
    if (c.coThue) hang.push(["Cho thuê", C.f0(c.thue) + " tr/tháng"]);
    var bw = Math.min(W - 160 * u, 860 * u), bx = (W - bw) / 2, by = ny + 110 * u, rh = 82 * u;
    hang.forEach(function (r, i) {
      var vi = raNhanh(kep((p - 0.2 - i * 0.08) / 0.2));
      ctx.save();
      ctx.globalAlpha *= vi;
      var yy = by + i * rh + (1 - vi) * 20 * u;
      ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.moveTo(bx, yy + rh); ctx.lineTo(bx + bw, yy + rh); ctx.stroke();
      ctx.textBaseline = "middle";
      ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = f(600, 34 * u);
      ctx.fillText(r[0], bx, yy + rh / 2);
      ctx.textAlign = "right"; ctx.fillStyle = VANG; ctx.font = f(800, 42 * u);
      ctx.fillText(r[1], bx + bw, yy + rh / 2);
      ctx.restore();
    });
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(255,255,255,0.68)"; ctx.font = f(500, 23 * u);
    var mien = catDong(ctx, "Số liệu tham khảo tại thời điểm quay, không phải cam kết lợi nhuận.", W - 160 * u);
    mien.forEach(function (d, i) { ctx.fillText(d, W / 2, H - (H > W ? H * 0.09 : 50 * u) + i * 30 * u); });
    ctx.restore();
  }

  function veCuoi(ctx, W, H, u, s, p) {
    ctx.fillStyle = DO; ctx.fillRect(0, 0, W, H);
    var doc = H > W;
    ctx.save();
    var a = raNhanh(kep(p / 0.2));
    ctx.globalAlpha *= a;
    var bs = 190 * u, by = doc ? H * 0.2 : H * 0.09;
    veBieuTuong(ctx, (W - bs) / 2, by + (1 - a) * 20 * u, bs, VANG);
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    var y = by + bs + 110 * u;
    ctx.fillStyle = TRANG; ctx.font = f(700, 42 * u);
    ctx.fillText("GỌI NGAY XEM NHÀ MIỄN PHÍ", W / 2, y);
    ctx.fillStyle = VANG; ctx.font = f(800, 118 * u);
    ctx.fillText("0983.221911", W / 2, y + 140 * u);
    ctx.fillStyle = TRANG; ctx.font = f(600, 36 * u);
    ctx.fillText("TRẦN VĂN DŨNG · CHECK IN BDS", W / 2, y + 215 * u);
    ctx.fillStyle = VANG; ctx.font = f(700, 30 * u);
    var tl = catDong(ctx, "MINH BẠCH – TOÀN DIỆN – HỖ TRỢ 24/7", W - 140 * u);
    tl.forEach(function (d, i) { ctx.fillText(d, W / 2, y + 290 * u + i * 40 * u); });
    ctx.restore();
  }

  function veKhung(ctx, W, H, kh, t) {
    var u = Math.min(W, H) / 1080;
    ctx.globalAlpha = 1;
    ctx.fillStyle = DO; ctx.fillRect(0, 0, W, H);
    var dang = kh.canh.filter(function (s) { return t >= s.bd && t < s.kt; });
    if (!dang.length) dang = [kh.canh[kh.canh.length - 1]];
    dang.forEach(function (s, i) {
      var p = kep((t - s.bd) / s.dur);
      ctx.save();
      if (i > 0 && kh.T > 0) {
        var q = kep((t - s.bd) / kh.T);
        if (kh.cai.chuyenCanh === "mo") ctx.globalAlpha = q;
        else if (kh.cai.chuyenCanh === "truot") ctx.translate((1 - raNhanh(q)) * W, 0);
      }
      if (s.loai === "mo") veMo(ctx, W, H, u, s, p, kh);
      else if (s.loai === "anh") veAnhCanh(ctx, W, H, u, s, p, kh);
      else if (s.loai === "so") veSo(ctx, W, H, u, s, p, kh);
      else veCuoi(ctx, W, H, u, s, p);
      ctx.restore();
    });
  }

  function choFont() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(["800 80px Montserrat", "700 40px Montserrat", "600 36px Montserrat", "500 24px Montserrat"].map(function (x) {
      return document.fonts.load(x).catch(function () {});
    })).catch(function () {});
  }

  /* ================= trình xem thử ================= */
  var PL = null;
  function dungXem() {
    if (PL) { PL.chay = false; cancelAnimationFrame(PL.raf); PL = null; }
  }
  function moXemThu(canvas, kh) {
    dungXem();
    var ctx = canvas.getContext("2d");
    var p = { kh: kh, t: 0, chay: false, raf: 0, moc: 0, ctx: canvas.getContext("2d"), canvas: canvas };
    PL = p;
    function veLai() {
      chuanBi(p.kh, p.t, 3.5);
      veKhung(ctx, canvas.width, canvas.height, p.kh, p.t);
      var tua = document.getElementById("v-tua"), gio = document.getElementById("v-gio");
      if (tua) tua.value = Math.round(p.t / p.kh.tong * 1000);
      if (gio) gio.textContent = mmss(p.t) + " / " + mmss(p.kh.tong);
    }
    function vong(now) {
      if (!p.chay || PL !== p) return;
      p.t = Math.min(p.kh.tong, (now - p.moc) / 1000);
      veLai();
      if (p.t >= p.kh.tong) { p.chay = false; nutChoi(false); return; }
      p.raf = requestAnimationFrame(vong);
    }
    p.choi = function () {
      if (p.t >= p.kh.tong - 0.05 || !p.daChoi) p.t = 0;   // lần bấm ▶ đầu tiên luôn chạy từ đầu
      p.daChoi = true;
      p.chay = true; p.moc = performance.now() - p.t * 1000;
      nutChoi(true);
      p.raf = requestAnimationFrame(vong);
    };
    p.dung = function () { p.chay = false; cancelAnimationFrame(p.raf); nutChoi(false); };
    p.tua = function (t) { p.daChoi = true; p.t = Math.max(0, Math.min(p.kh.tong, t)); p.moc = performance.now() - p.t * 1000; if (!p.chay) veLai(); };
    p.doi = function (kh2, giuGio) {
      p.kh = kh2;
      if (!giuGio) p.t = 0;
      p.t = Math.min(p.t, kh2.tong);
      p.moc = performance.now() - p.t * 1000;
      if (!p.chay) veLai();
    };
    p.veLai = veLai;
    p.t = Math.min(1.4, kh.tong);         // khung chờ: đúng lúc câu mở đầu đã hiện rõ
    choAnhDau(kh).then(choFont).then(function () { if (PL === p) veLai(); });
    veLai();
    return p;
  }
  function nutChoi(dangChay) {
    var b = document.getElementById("v-play");
    if (!b) return;
    b.innerHTML = dangChay ? "&#10074;&#10074;" : "&#9654;";
    b.classList.toggle("dang", !!dangChay);
    b.setAttribute("aria-label", dangChay ? "Tạm dừng" : "Xem thử");
  }
  function mmss(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ":" + ("0" + (t % 60)).slice(-2); }

  /* ================= xuất video ================= */
  function chonDinhDang(coTieng) {
    var ds = coTieng
      ? ["video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
      : ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    if (!global.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
    for (var i = 0; i < ds.length; i++) if (MediaRecorder.isTypeSupported(ds[i])) return ds[i];
    return "";
  }
  function hoTroXuat() {
    return !!(global.MediaRecorder && HTMLCanvasElement.prototype.captureStream);
  }

  var DANG_XUAT = null;

  function xuatVideo(kh, am, ac, baoTien) {
    var kt = kichThuoc(kh.cai, false), W = kt.w, H = kt.h;
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    cv.className = "v-ghi";
    document.body.appendChild(cv);
    var ctx = cv.getContext("2d");
    var khoa = null, huy = false, ngu = null;

    return choFont().then(function () { return choAnhDau(kh); }).then(function () {
      veKhung(ctx, W, H, kh, 0);
      if (navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request("screen").then(function (k) { khoa = k; }).catch(function () {});
      }
      var stream = cv.captureStream(30);
      var nguon = null, chinh = null;
      var buoc = Promise.resolve();
      if (am && ac) {
        buoc = am.blob.arrayBuffer().then(function (ab) { return ac.decodeAudioData(ab); }).then(function (buf) {
          var dich = ac.createMediaStreamDestination();
          chinh = ac.createGain();
          chinh.gain.value = kh.cai.amLuong;
          nguon = ac.createBufferSource();
          nguon.buffer = buf;
          nguon.loop = buf.duration < kh.tong;
          nguon.connect(chinh); chinh.connect(dich);
          dich.stream.getAudioTracks().forEach(function (tr) { stream.addTrack(tr); });
        }).catch(function () { nguon = null; });
      }
      return buoc.then(function () {
        var mime = chonDinhDang(!!nguon);
        var tuyChon = { videoBitsPerSecond: kh.cai.chatLuong === "720" ? 5000000 : 8000000, audioBitsPerSecond: 160000 };
        if (mime) tuyChon.mimeType = mime;
        var rec = new MediaRecorder(stream, tuyChon);
        var manh = [];
        rec.ondataavailable = function (e) { if (e.data && e.data.size) manh.push(e.data); };

        return new Promise(function (ok, loi) {
          ngu = function () {
            if (document.visibilityState === "hidden") {
              huy = true;
              try { rec.stop(); } catch (e) { /* đã dừng */ }
            }
          };
          document.addEventListener("visibilitychange", ngu);
          DANG_XUAT = { huy: function () { huy = true; try { rec.stop(); } catch (e) { /* đã dừng */ } } };

          rec.onstop = function () {
            if (huy) return loi(new Error("dừng"));
            ok({ blob: new Blob(manh, { type: (rec.mimeType || mime || "video/webm").split(";")[0] }), w: W, h: H, mime: rec.mimeType || mime });
          };
          rec.onerror = function (e) { loi(e.error || new Error("Lỗi ghi video")); };

          rec.start(1000);
          if (nguon) {
            if (ac.state === "suspended") ac.resume();
            nguon.start();
            var tat = ac.currentTime + Math.max(0, kh.tong - 1.2);
            chinh.gain.setValueAtTime(kh.cai.amLuong, tat);
            chinh.gain.linearRampToValueAtTime(0, tat + 1.1);
          }
          var moc = performance.now(), lanBao = 0;
          function vong(now) {
            if (huy) return;
            var t = (now - moc) / 1000;
            chuanBi(kh, t, 4);
            veKhung(ctx, W, H, kh, Math.min(t, kh.tong));
            if (now - lanBao > 250) { lanBao = now; baoTien(Math.min(t, kh.tong), kh.tong); }
            if (t >= kh.tong + 0.15) {
              setTimeout(function () { try { rec.stop(); } catch (e) { /* đã dừng */ } }, 120);
              return;
            }
            requestAnimationFrame(vong);
          }
          requestAnimationFrame(vong);
        });
      });
    }).then(function (kq) {
      // ảnh đại diện cho phiên bản
      var tw = Math.round(W / 4), th = Math.round(H / 4);
      var c2 = document.createElement("canvas"); c2.width = tw; c2.height = th;
      veKhung(c2.getContext("2d"), tw, th, kh, Math.min(1.4, kh.tong * 0.3));
      return new Promise(function (ok) { c2.toBlob(function (b) { kq.thumb = b; ok(kq); }, "image/jpeg", 0.82); });
    }).finally(function () {
      if (ngu) document.removeEventListener("visibilitychange", ngu);
      if (khoa) khoa.release().catch(function () {});
      cv.remove();
      DANG_XUAT = null;
    });
  }

  /* ================= bài đăng ================= */
  function baiFb(c) {
    var L = [];
    var tieu = ["BÁN", c.loai.toUpperCase(), c.dc.toUpperCase()];
    if (c.khu) tieu.push(c.khu.toUpperCase());
    if (c.dt > 0) tieu.push("— " + C.f0(c.dt) + "M²");
    if (c.gia > 0) tieu.push("— " + C.f1(c.gia) + " TỶ");
    L.push(tieu.join(" "));
    if (c.coGia && c.mos >= 15) L.push("Thấp hơn giá thị trường " + C.f1(c.chenh) + " tỷ · biên an toàn " + C.f1(c.mos) + "%");
    L.push("");
    L.push("Dành cho " + c.kh.ten.toLowerCase() + ": " + c.kh.goc + ".");
    L.push("");
    L.push("THÔNG TIN");
    if (c.dt > 0) L.push("- Diện tích: " + C.f0(c.dt) + " m²");
    var kc = [c.tang > 0 ? c.tang + " tầng" : "", c.pn > 0 ? c.pn + " phòng ngủ" : ""].filter(Boolean);
    if (kc.length) L.push("- Kết cấu: " + kc.join(", "));
    L.push("- Hướng: " + c.huong);
    L.push("- Pháp lý: " + c.pl.ten);
    if (c.coGia) {
      L.push("");
      L.push("PHÂN TÍCH GIÁ");
      if (c.bgd > 0) L.push("- Giá theo Bảng giá đất NQ87/2026: " + C.f1(c.bgd) + " tỷ");
      L.push("- Giá thị trường khu vực: " + C.f1(c.tt) + " tỷ");
      L.push("- Giá chủ bán: " + C.f1(c.gia) + " tỷ");
      L.push("- Biên an toàn (MoS): " + C.f1(c.mos) + "%" + (c.mos >= 20 ? " — đạt chuẩn tư vấn 20% của Check in BDS" : ""));
      if (c.dongia > 0) L.push("- Đơn giá: " + C.f0(c.dongia) + " triệu/m²");
    }
    if (c.coThue) L.push("- Cho thuê: " + C.f0(c.thue) + " triệu/tháng, lợi suất " + C.f1(c.yld) + "%/năm");
    L.push("");
    L.push("GỌI NGAY XEM NHÀ MIỄN PHÍ");
    L.push("Trần Văn Dũng — 0983.221911");
    L.push("MINH BẠCH – TOÀN DIỆN – HỖ TRỢ 24/7");
    L.push("");
    L.push("Số liệu tham khảo tại thời điểm đăng, không phải cam kết lợi nhuận.");
    L.push("");
    L.push(C.tags(c));
    return L.join("\n");
  }
  function baiTt(c) {
    var d = c.loai + " " + c.dc + (c.khu ? ", " + c.khu : "");
    if (c.gia > 0) d += " — " + C.f1(c.gia) + " tỷ";
    if (c.coGia && c.mos > 0) d += ", thấp hơn giá thị trường " + C.f1(c.mos) + "%";
    d += ". Gọi 0983.221911 xem nhà miễn phí.";
    var kv = (c.khu || "TPHCM").replace(/\s+/g, "");
    return d + "\n\n#CheckInBDS #BDSTPHCM #" + kv + " #DauTuBDS #BienAnToan20 #NhaDep";
  }

  /* ================= màn hình ================= */
  function e(s) { return C.esc(s); }

  function chonTaiSan(r) {
    var ds = C.items();
    if (!ds.length) return null;
    var id = r.id || C.cai().videoTs;
    if (!id || !C.tim(id)) {
      var coAnh = ds.filter(function (it) { return global.Anh && Anh.dem(it.id); });
      id = (coAnh[0] || ds[0]).id;
    }
    C.cai().videoTs = id;
    return C.tim(id);
  }

  function man(r) {
    C = global.CIB;
    dungXem();
    var it = chonTaiSan(r);
    if (!it) {
      return '<div class="screen"><div class="card empty"><h2>Chưa có tài sản nào</h2>' +
        "<p>Thêm một căn và chụp vài tấm ảnh, rồi quay lại đây dựng video.</p>" +
        '<a class="btn" href="#/moi" style="max-width:220px;margin:14px auto 0">Thêm tài sản</a></div></div>';
    }
    var c = C.tinh(it), cai = caiCua(it), sub = r.sub || "dung";
    var soBan = banCua(it.id).length;
    var h = '<div class="screen" id="studio" data-id="' + e(it.id) + '">';
    h += '<div class="chon-ts"><label for="v-ts">Tài sản</label><select id="v-ts">' +
      C.items().map(function (x) {
        var n = global.Anh ? Anh.dem(x.id) : 0;
        return '<option value="' + e(x.id) + '"' + (x.id === it.id ? " selected" : "") + ">" +
          e((x.dc || "Chưa đặt tên") + (n ? " · " + n + " ảnh" : " · chưa có ảnh")) + "</option>";
      }).join("") + "</select></div>";
    h += '<div class="seg" role="tablist">' + [["dung", "Dựng video"], ["bai", "Bài đăng"], ["luu", "Đã lưu" + (soBan ? " " + soBan : "")]].map(function (x) {
      return '<button type="button" role="tab" data-vsub="' + x[0] + '" aria-selected="' + (sub === x[0]) + '">' + x[1] + "</button>";
    }).join("") + "</div>";
    if (sub === "bai") h += vBai(it, c);
    else if (sub === "luu") h += vLuu(it);
    else h += vDung(it, c, cai);
    return h + "</div>";
  }

  function chip(nhom, gt, dang, nhan) {
    return '<button type="button" class="v-chip" data-dat="' + nhom + '" data-gt="' + gt + '" aria-pressed="' + (dang === gt) + '">' + nhan + "</button>";
  }
  function bat(id, dang, nhan, phu) {
    return '<label class="v-bat"><span><b>' + nhan + "</b>" + (phu ? "<small>" + phu + "</small>" : "") + "</span>" +
      '<input type="checkbox" data-bat="' + id + '"' + (dang ? " checked" : "") + '><i aria-hidden="true"></i></label>';
  }

  function vDung(it, c, cai) {
    var h = "";
    if (!hoTroXuat()) {
      h += '<div class="card canh-bao"><h2>Trình duyệt chưa xuất được video</h2><p class="hint">Anh vẫn xem thử được. Để xuất video, mở app bằng Safari (iPhone) hoặc Chrome (Android) bản mới.</p></div>';
    }
    var anh = dsAnh(it, cai), soAnh = anh.dung.length + anh.boRa.length;
    if (!soAnh) {
      h += '<div class="card canh-bao"><h2>Căn này chưa có ảnh</h2><p class="hint">Video vẫn dựng được với chữ trên nền đỏ đô, nhưng có ảnh thật sẽ đẹp hơn nhiều.</p>' +
        '<button class="btn" type="button" data-them-anh="' + e(it.id) + '">Chụp hoặc chọn ảnh</button></div>';
    }
    var k = KHUNG[cai.khung] || KHUNG.doc;
    h += '<div class="v-xem v-' + cai.khung + '"><canvas id="v-canvas"></canvas>' +
      '<button type="button" id="v-play" class="v-play" aria-label="Xem thử">&#9654;</button></div>';
    h += '<div class="v-thanh"><input type="range" id="v-tua" min="0" max="1000" value="0" aria-label="Tua">' +
      '<span id="v-gio">0:00</span></div>';

    h += '<div class="card"><h2>Phương án nhanh</h2><div class="v-mau">' +
      Object.keys(MAU).map(function (m) {
        return '<button type="button" class="v-mau-o" data-mau="' + m + '" aria-pressed="' + (cai.mau === m) + '"><b>' + MAU[m].ten + "</b><small>" + MAU[m].mo + "</small></button>";
      }).join("") + "</div>" +
      '<p class="hint" style="margin:10px 0 0">Chạm một phương án rồi bấm ▶ xem thử. Chỉnh tiếp từng mục bên dưới, mỗi thay đổi hiện ngay trên khung xem.</p></div>';

    // dòng thời gian
    h += '<div class="card"><h2>Dòng thời gian · ' + mmss(keHoach(it, c, cai).tong) + "</h2>";
    h += '<div class="v-tl">';
    var dung = anh.dung;
    h += '<div class="v-hang v-hang-mo"><div class="v-nho">' + (dung[0] ? '<img data-thumb="' + e(dung[0]) + '" alt="">' : '<span class="v-nen"></span>') + "<em>Mở</em></div>" +
      '<div class="v-o"><label for="v-hook">Câu mở đầu — chữ lớn vàng đồng</label>' +
      '<textarea id="v-hook" rows="2" data-chu="hook">' + e(cai.hook != null ? cai.hook : hookGoiY(c)) + "</textarea></div></div>";
    var goi = phuDeGoiY(c);
    dung.slice(1).forEach(function (id, i) {
      var chu = cai.phuDe[id] != null ? cai.phuDe[id] : (goi[i] || "");
      h += '<div class="v-hang"><div class="v-nho"><img data-thumb="' + e(id) + '" alt=""><em>' + (i + 2) + "</em></div>" +
        '<div class="v-o"><label for="v-pd-' + e(id) + '">Chữ trên ảnh ' + (i + 2) + "</label>" +
        '<input id="v-pd-' + e(id) + '" data-chu="pd" data-anh="' + e(id) + '" value="' + e(chu) + '" placeholder="Để trống = không có chữ" autocomplete="off"' + (cai.coPhuDe ? "" : " disabled") + ">" +
        '<div class="v-nut-hang">' +
        '<button type="button" data-di="' + e(id) + '" data-huong="-1" aria-label="Lên trước">▲</button>' +
        '<button type="button" data-di="' + e(id) + '" data-huong="1" aria-label="Xuống sau">▼</button>' +
        '<button type="button" data-bo="' + e(id) + '">Bỏ khỏi video</button></div></div></div>';
    });
    if (dung.length > 1) {
      h += '<p class="hint" style="margin:2px 0 10px">Ảnh đầu tiên là cảnh mở. Muốn đổi ảnh mở, bấm ▲ ở ảnh muốn đưa lên.</p>';
    }
    h += "</div>";
    if (anh.boRa.length) {
      h += '<div class="v-boRa"><span>Ảnh chưa dùng — chạm để thêm lại:</span><div>' +
        anh.boRa.map(function (id) {
          return '<button type="button" class="v-them-lai" data-themlai="' + e(id) + '" aria-label="Thêm ảnh vào video"><img data-thumb="' + e(id) + '" alt=""><b>+</b></button>';
        }).join("") + "</div></div>";
    }
    h += bat("coSo", cai.coSo && c.coGia, "Bảng số liệu MoS", c.coGia ? "4 giây · số đếm lên, có dòng miễn trừ" : "Cần nhập giá bán và giá thị trường");
    h += bat("coCuoi", cai.coCuoi, "Cảnh cuối", "Số điện thoại + tagline · 3 giây");
    h += "</div>";

    h += '<div class="card"><h2>Chuyển động &amp; nhịp</h2>' +
      '<p class="v-nhan">Chuyển động ảnh</p><div class="v-chips">' +
      Object.keys(TEN_DONG).map(function (x) { return chip("chuyenDong", x, cai.chuyenDong, TEN_DONG[x]); }).join("") + "</div>" +
      '<p class="v-nhan">Chuyển cảnh</p><div class="v-chips">' +
      Object.keys(TEN_CANH).map(function (x) { return chip("chuyenCanh", x, cai.chuyenCanh, TEN_CANH[x]); }).join("") + "</div>" +
      '<p class="v-nhan">Mỗi ảnh dài <b id="v-giay-so">' + C.f1(+cai.giayAnh) + " giây</b></p>" +
      '<input type="range" id="v-giay" min="1.5" max="6" step="0.5" value="' + cai.giayAnh + '" aria-label="Số giây mỗi ảnh"></div>';

    h += '<div class="card"><h2>Chữ trên video</h2>' +
      bat("coPhuDe", cai.coPhuDe, "Chữ trên từng ảnh", "Tắt để video chỉ có ảnh") +
      '<p class="v-nhan">Cỡ chữ</p><div class="v-chips">' +
      chip("coChu", "nho", cai.coChu, "Nhỏ") + chip("coChu", "vua", cai.coChu, "Vừa") + chip("coChu", "lon", cai.coChu, "Lớn") + "</div>" +
      '<p class="v-nhan">Vị trí chữ</p><div class="v-chips">' +
      chip("viTri", "tren", cai.viTri, "Trên") + chip("viTri", "giua", cai.viTri, "Giữa") + chip("viTri", "duoi", cai.viTri, "Dưới") + "</div>" +
      bat("coLogo", cai.coLogo, "Logo + số điện thoại góc trên", "Theo vùng bảo vệ logo của Brand Guideline") + "</div>";

    h += '<div class="card"><h2>Khung hình &amp; chất lượng</h2><div class="v-chips v-chips-khung">' +
      Object.keys(KHUNG).map(function (x) {
        return '<button type="button" class="v-chip" data-dat="khung" data-gt="' + x + '" aria-pressed="' + (cai.khung === x) + '">' + KHUNG[x].ten + "<small>" + KHUNG[x].phu + "</small></button>";
      }).join("") + "</div>" +
      '<p class="v-nhan">Chất lượng</p><div class="v-chips">' +
      chip("chatLuong", "1080", cai.chatLuong, "1080p — nét nhất") + chip("chatLuong", "720", cai.chatLuong, "720p — nhẹ, xuất nhanh") + "</div></div>";

    h += '<div class="card"><h2>Âm thanh</h2><div id="v-am">' + amHTML(null) + "</div>" +
      '<p class="v-nhan">Âm lượng <b id="v-am-so">' + Math.round(cai.amLuong * 100) + "%</b></p>" +
      '<input type="range" id="v-amluong" min="0" max="1" step="0.05" value="' + cai.amLuong + '" aria-label="Âm lượng">' +
      '<p class="hint" style="margin:10px 0 0">Thu giọng đọc kịch bản bằng app Ghi âm của điện thoại, hoặc chọn một bản nhạc anh có quyền dùng. Âm thanh tự nhỏ dần ở 1 giây cuối.</p>' +
      '<input type="file" id="v-am-file" accept="audio/*" class="an-file"></div>';

    h += '<div class="v-xuat"><button type="button" class="btn alt" id="v-lai">Xem từ đầu</button>' +
      '<button type="button" class="btn" id="v-xuat-nut"' + (hoTroXuat() ? "" : " disabled") + ">Xuất video · " + mmss(keHoach(it, c, cai).tong) + "</button></div>";
    return h;
  }

  function amHTML(am) {
    if (!am) return '<div class="v-am-dong"><span>Chưa có âm thanh — video im lặng</span>' +
      '<button type="button" class="btn nho" id="v-am-chon">Chọn nhạc / giọng đọc</button></div>';
    return '<div class="v-am-dong"><span><b>' + e(am.ten || "Âm thanh") + "</b></span>" +
      '<div><button type="button" class="btn alt nho" id="v-am-chon">Đổi</button> ' +
      '<button type="button" class="btn rui nho" id="v-am-bo">Bỏ</button></div></div>';
  }

  function vBai(it, c) {
    var bai = it.bai || {};
    var fb = bai.fb != null ? bai.fb : baiFb(c);
    var tt = bai.tt != null ? bai.tt : baiTt(c);
    return '<p class="saved" id="v-bai-luu">' + (bai.sua ? "Đã lưu " + C.gio(bai.sua) : "Bản gợi ý — sửa tới đâu tự lưu tới đó") + "</p>" +
      '<div class="card"><h2>Facebook / Fanpage</h2>' +
      '<textarea id="v-fb" class="v-bai" rows="18" data-bai="fb">' + e(fb) + "</textarea>" +
      '<p class="v-dem" id="v-fb-dem">' + fb.length + " ký tự</p>" +
      '<div class="btn-row"><button class="btn" type="button" data-bai-copy="fb">Copy</button>' +
      '<button class="btn alt" type="button" data-bai-share="fb">Chia sẻ</button></div>' +
      '<button class="btn alt" type="button" data-bai-goiy="fb">Lấy lại bản gợi ý</button></div>' +
      '<div class="card"><h2>TikTok / Reels — chú thích ngắn</h2>' +
      '<textarea id="v-tt" class="v-bai" rows="6" data-bai="tt">' + e(tt) + "</textarea>" +
      '<p class="v-dem" id="v-tt-dem">' + tt.length + " / 2.200 ký tự</p>" +
      '<div class="btn-row"><button class="btn" type="button" data-bai-copy="tt">Copy</button>' +
      '<button class="btn alt" type="button" data-bai-share="tt">Chia sẻ</button></div>' +
      '<button class="btn alt" type="button" data-bai-goiy="tt">Lấy lại bản gợi ý</button></div>' +
      '<p class="hint">Bài gợi ý chỉ dùng số liệu anh đã nhập. Ghi chú riêng của anh không bao giờ được đưa vào bài. Khi gửi video ở mục Đã lưu, chú thích TikTok được copy sẵn để anh dán.</p>';
  }

  function vLuu(it) {
    var ds = banCua(it.id);
    if (!ds.length) {
      return '<div class="card empty"><h2>Chưa có video nào</h2><p>Qua mục Dựng video, chỉnh xong bấm Xuất video. Mỗi lần xuất là một phiên bản, anh so sánh rồi chọn bản ưng ý.</p>' +
        '<button type="button" class="btn" data-vsub="dung" style="max-width:220px;margin:14px auto 0">Dựng video</button></div>';
    }
    var tong = ds.reduce(function (s, b) { return s + (b.size || 0); }, 0);
    var h = '<p class="hint">' + ds.length + " phiên bản · " + C.mb(tong) + ". Đánh dấu ★ bản ưng ý, rồi gửi đi.</p>";
    h += ds.map(function (b) {
      var k = KHUNG[b.cai && b.cai.khung] || KHUNG.doc;
      var mt = [k.ten, (b.h > b.w ? b.w : b.h) + "p", mmss(b.giay), C.mb(b.size || 0)].join(" · ");
      var kieu = b.cai ? [(MAU[b.cai.mau] || {}).ten, TEN_DONG[b.cai.chuyenDong], TEN_CANH[b.cai.chuyenCanh], C.f1(+b.cai.giayAnh) + "s/ảnh"].filter(Boolean).join(" · ") : "";
      return '<div class="card v-ban' + (b.thich ? " thich" : "") + '" data-ban="' + e(b.id) + '">' +
        '<div class="v-ban-dau"><button type="button" class="v-ban-anh v-' + ((b.cai && b.cai.khung) || "doc") + '" data-xemban="' + e(b.id) + '" aria-label="Xem video"><img data-banthumb="' + e(b.id) + '" alt=""><i>&#9654;</i></button>' +
        '<div class="v-ban-chu"><b>Bản ' + b.so + (b.thich ? ' <span class="sao">★ Ưng ý</span>' : "") + "</b>" +
        "<small>" + e(mt) + "</small><small>" + e(kieu) + "</small><small>" + C.ngay(b.tao) + " " + C.gio(b.tao) + "</small></div></div>" +
        '<div class="v-ban-video" id="vb-' + e(b.id) + '"></div>' +
        '<div class="v-ban-nut">' +
        '<button type="button" class="btn' + (b.thich ? "" : " alt") + ' nho" data-thich="' + e(b.id) + '">' + (b.thich ? "★ Ưng ý" : "☆ Ưng ý") + "</button>" +
        '<button type="button" class="btn nho" data-guiban="' + e(b.id) + '">Gửi / lưu</button>' +
        '<button type="button" class="btn alt nho" data-taiban="' + e(b.id) + '">Tải file</button>' +
        '<button type="button" class="btn alt nho" data-dunglai="' + e(b.id) + '">Dựng lại từ bản này</button>' +
        '<button type="button" class="btn rui nho" data-xoaban="' + e(b.id) + '">Xoá</button></div></div>';
    }).join("");
    if (ds.some(function (b) { return !b.thich; }) && ds.some(function (b) { return b.thich; })) {
      h += '<button type="button" class="btn rui" id="v-don">Xoá các bản chưa ưng ý</button>';
    }
    return h;
  }

  /* ================= gắn sự kiện ================= */
  var HEN = null;
  function gan(r) {
    C = global.CIB;
    var box = document.getElementById("studio");
    if (!box) return;
    var it = C.tim(box.getAttribute("data-id"));
    if (!it) return;
    var sub = r.sub || "dung";

    var sel = document.getElementById("v-ts");
    if (sel) sel.addEventListener("change", function () { location.hash = "#/video/" + sel.value + "/" + sub; });

    box.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-vsub]");
      if (b) { location.hash = "#/video/" + it.id + "/" + b.getAttribute("data-vsub"); }
    });

    if (sub === "dung") ganDung(it);
    if (sub === "bai") ganBai(it);
    if (sub === "luu") ganLuu(it);
  }

  function ganDung(it) {
    var c = C.tinh(it), cai = caiCua(it);
    var canvas = document.getElementById("v-canvas");
    var kt = kichThuoc(cai, true);
    canvas.width = kt.w; canvas.height = kt.h;
    var pl = moXemThu(canvas, keHoach(it, c, cai));
    var amHienTai = null;

    function capNhat(giuGio, veLaiMan) {
      luuCai(it, cai);
      if (veLaiMan) { giuCuon(); return; }
      var kh = keHoach(it, c, cai);
      pl.doi(kh, giuGio);
      var nx = document.getElementById("v-xuat-nut");
      if (nx) nx.textContent = "Xuất video · " + mmss(kh.tong);
      Array.prototype.forEach.call(document.querySelectorAll(".card > h2"), function (h2) {
        if (/^Dòng thời gian/.test(h2.textContent)) h2.textContent = "Dòng thời gian · " + mmss(kh.tong);
      });
    }

    document.getElementById("v-play").addEventListener("click", function () { if (pl.chay) pl.dung(); else pl.choi(); });
    canvas.addEventListener("click", function () { if (pl.chay) pl.dung(); else pl.choi(); });
    var tua = document.getElementById("v-tua");
    tua.addEventListener("input", function () { pl.tua(tua.value / 1000 * pl.kh.tong); });
    document.getElementById("v-lai").addEventListener("click", function () { pl.tua(0); pl.choi(); window.scrollTo({ top: 0, behavior: "smooth" }); });

    var studio = document.getElementById("studio");
    studio.addEventListener("click", function (ev) {
      var t = ev.target;
      var mau = t.closest("[data-mau]");
      if (mau) {
        var m = MAU[mau.getAttribute("data-mau")];
        Object.keys(m).forEach(function (k) { if (k !== "ten" && k !== "mo") cai[k] = m[k]; });
        cai.mau = mau.getAttribute("data-mau");
        capNhat(false, true);
        C.toast("Đã áp dụng <b>" + m.ten + "</b> — bấm ▶ xem thử");
        return;
      }
      var dat = t.closest("[data-dat]");
      if (dat) {
        var k = dat.getAttribute("data-dat"), gt = dat.getAttribute("data-gt");
        cai[k] = gt;
        cai.mau = "";
        Array.prototype.forEach.call(document.querySelectorAll('[data-dat="' + k + '"]'), function (x) {
          x.setAttribute("aria-pressed", x === dat ? "true" : "false");
        });
        Array.prototype.forEach.call(document.querySelectorAll("[data-mau]"), function (x) { x.setAttribute("aria-pressed", "false"); });
        if (k === "khung") { capNhat(false, true); return; }
        capNhat(k === "coChu" || k === "viTri");
        if (k === "coChu" || k === "viTri") pl.veLai();
        return;
      }
      var di = t.closest("[data-di]");
      if (di) {
        var ds = dsAnh(it, cai).dung, id = di.getAttribute("data-di"), i = ds.indexOf(id), j = i + parseInt(di.getAttribute("data-huong"), 10);
        if (i < 0 || j < 0 || j >= ds.length) return;
        ds.splice(i, 1); ds.splice(j, 0, id);
        cai.anh = ds;
        capNhat(false, true);
        return;
      }
      var bo = t.closest("[data-bo]");
      if (bo) {
        cai.anh = dsAnh(it, cai).dung.filter(function (x) { return x !== bo.getAttribute("data-bo"); });
        capNhat(false, true);
        return;
      }
      var tl = t.closest("[data-themlai]");
      if (tl) {
        var d2 = dsAnh(it, cai).dung;
        d2.push(tl.getAttribute("data-themlai"));
        cai.anh = d2;
        capNhat(false, true);
      }
    });

    studio.addEventListener("input", function (ev) {
      var t = ev.target;
      if (t.getAttribute("data-chu") === "hook") { cai.hook = t.value; capNhat(true); pl.tua(Math.min(pl.t, 1.5)); return; }
      if (t.getAttribute("data-chu") === "pd") {
        cai.phuDe[t.getAttribute("data-anh")] = t.value;
        capNhat(true);
        var s = pl.kh.canh.filter(function (x) { return x.anh === t.getAttribute("data-anh"); })[0];
        if (s && !pl.chay) pl.tua(s.bd + Math.min(1.2, s.dur * 0.5));
      }
    });
    studio.addEventListener("focusin", function (ev) {
      var t = ev.target;
      if (t.getAttribute("data-chu") === "pd") {
        var s = pl.kh.canh.filter(function (x) { return x.anh === t.getAttribute("data-anh"); })[0];
        if (s) { pl.dung(); pl.tua(s.bd + Math.min(1.2, s.dur * 0.5)); }
      }
      if (t.getAttribute("data-chu") === "hook") { pl.dung(); pl.tua(1.2); }
    });
    studio.addEventListener("change", function (ev) {
      var k = ev.target.getAttribute("data-bat");
      if (!k) return;
      cai[k] = ev.target.checked;
      cai.mau = "";
      capNhat(false, k === "coPhuDe");
    });

    var g = document.getElementById("v-giay");
    g.addEventListener("input", function () {
      cai.giayAnh = +g.value; cai.mau = "";
      document.getElementById("v-giay-so").textContent = C.f1(+g.value) + " giây";
      clearTimeout(HEN);
      HEN = setTimeout(function () { capNhat(false); }, 120);
    });
    var al = document.getElementById("v-amluong");
    al.addEventListener("input", function () {
      cai.amLuong = +al.value;
      document.getElementById("v-am-so").textContent = Math.round(cai.amLuong * 100) + "%";
      luuCai(it, cai);
    });

    // âm thanh
    var oAm = document.getElementById("v-am-file");
    function veAm() {
      var box2 = document.getElementById("v-am");
      if (!box2) return;
      box2.innerHTML = amHTML(amHienTai);
      var chon = document.getElementById("v-am-chon");
      if (chon) chon.addEventListener("click", function () { oAm.click(); });
      var boAm = document.getElementById("v-am-bo");
      if (boAm) boAm.addEventListener("click", function () {
        xoaAm(it.id).then(function () { amHienTai = null; veAm(); C.toast("Đã bỏ âm thanh"); });
      });
    }
    oAm.addEventListener("change", function () {
      var fi = oAm.files && oAm.files[0];
      oAm.value = "";
      if (!fi) return;
      luuAm(it.id, fi, fi.name).then(function () {
        amHienTai = { blob: fi, ten: fi.name };
        veAm();
        C.toast("Đã gắn <b>" + e(fi.name) + "</b>");
      }, function () { C.toast("Không lưu được file âm thanh", 4); });
    });
    layAm(it.id).then(function (a) { amHienTai = a || null; veAm(); });
    veAm();

    // xuất
    var nut = document.getElementById("v-xuat-nut");
    nut.addEventListener("click", function () {
      if (DANG_XUAT) return;
      pl.dung();
      var kh = keHoach(it, c, cai);
      var ac = null;
      if (amHienTai && (global.AudioContext || global.webkitAudioContext)) {
        // tạo và mở âm thanh ngay trong cú chạm — iPhone chỉ cho phát tiếng khi làm vậy
        try { ac = new (global.AudioContext || global.webkitAudioContext)(); ac.resume(); } catch (er) { ac = null; }
      }
      var lop = document.createElement("div");
      lop.className = "v-dang";
      lop.innerHTML = '<div class="v-dang-o"><b>Đang dựng video</b><p id="v-dang-chu">Chuẩn bị ảnh…</p>' +
        '<div class="v-dang-thanh"><span id="v-dang-tien"></span></div>' +
        "<small>Giữ màn hình mở và đừng chuyển app. Video dài " + mmss(kh.tong) + " thì dựng mất khoảng chừng ấy thời gian.</small>" +
        '<button type="button" class="btn alt nho" id="v-dang-huy">Huỷ</button></div>';
      document.body.appendChild(lop);
      document.getElementById("v-dang-huy").addEventListener("click", function () { if (DANG_XUAT) DANG_XUAT.huy(); });

      xuatVideo(kh, amHienTai, ac, function (t, tong) {
        var x = document.getElementById("v-dang-tien"), ch = document.getElementById("v-dang-chu");
        if (x) x.style.width = Math.round(t / tong * 100) + "%";
        if (ch) ch.textContent = mmss(t) + " / " + mmss(tong);
      }).then(function (kq) {
        var cu = banCua(it.id);
        var so = cu.reduce(function (m, b) { return Math.max(m, b.so || 0); }, 0) + 1;
        var meta = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          ts: it.id, so: so, tao: Date.now(), w: kq.w, h: kq.h, giay: kh.tong,
          mime: kq.mime, size: kq.blob.size, thich: false, cai: JSON.parse(JSON.stringify(cai))
        };
        return luuBan(meta, kq.blob, kq.thumb).then(function () {
          lop.remove();
          if (ac) ac.close().catch(function () {});
          C.toast("Đã xuất <b>Bản " + so + "</b> · " + C.mb(kq.blob.size), 4);
          location.hash = "#/video/" + it.id + "/luu";
        });
      }).catch(function (er) {
        lop.remove();
        if (ac) ac.close().catch(function () {});
        if (er && er.message === "dừng") C.toast("Đã dừng dựng video. Giữ màn hình mở và ở lại trong app cho tới khi xong.", 5);
        else C.toast("Không dựng được video: " + e((er && er.message) || "lỗi không rõ"), 6);
      });
    });
  }

  function giuCuon() {
    var y = window.scrollY;
    C.ve();
    requestAnimationFrame(function () { window.scrollTo(0, y); });
  }

  function ganBai(it) {
    var c = C.tinh(it);
    var hen2 = null;
    function luu() {
      var fb = document.getElementById("v-fb"), tt = document.getElementById("v-tt");
      it.bai = { fb: fb.value, tt: tt.value, sua: Date.now() };
      it.sua = Date.now();
      document.getElementById("v-fb-dem").textContent = fb.value.length + " ký tự";
      document.getElementById("v-tt-dem").textContent = tt.value.length + " / 2.200 ký tự";
      clearTimeout(hen2);
      hen2 = setTimeout(function () {
        C.ghiHoan();
        var s = document.getElementById("v-bai-luu");
        if (s) s.textContent = "Đã lưu " + C.gio(Date.now());
      }, 350);
    }
    var box = document.getElementById("studio");
    box.addEventListener("input", function (ev) { if (ev.target.hasAttribute("data-bai")) luu(); });
    box.addEventListener("click", function (ev) {
      var t = ev.target;
      var cp = t.closest("[data-bai-copy]");
      if (cp) { C.copy(document.getElementById("v-" + cp.getAttribute("data-bai-copy")).value, "bài đăng"); return; }
      var sh = t.closest("[data-bai-share]");
      if (sh) { C.chiaSe("Bài đăng — " + c.dc, document.getElementById("v-" + sh.getAttribute("data-bai-share")).value, "bài đăng"); return; }
      var gy = t.closest("[data-bai-goiy]");
      if (gy) {
        if (gy.getAttribute("data-sure") !== "1") {
          gy.setAttribute("data-sure", "1"); gy.textContent = "Chạm lần nữa — bài đã sửa sẽ bị thay";
          setTimeout(function () { if (gy.isConnected) { gy.removeAttribute("data-sure"); gy.textContent = "Lấy lại bản gợi ý"; } }, 4000);
          return;
        }
        var loai = gy.getAttribute("data-bai-goiy");
        document.getElementById("v-" + loai).value = loai === "fb" ? baiFb(c) : baiTt(c);
        gy.removeAttribute("data-sure"); gy.textContent = "Lấy lại bản gợi ý";
        luu();
        C.toast("Đã lấy lại bản gợi ý");
      }
    });
  }

  function ganLuu(it) {
    var blobs = {};
    banCua(it.id).forEach(function (b) {
      layBan(b.id).then(function (f) {
        if (!f) return;
        blobs[b.id] = f.blob;
        var img = document.querySelector('[data-banthumb="' + b.id + '"]');
        if (img && f.thumb) {
          if (!URL_THUMB[b.id]) URL_THUMB[b.id] = URL.createObjectURL(f.thumb);
          img.src = URL_THUMB[b.id];
        }
      });
    });
    function duoi(b) { return /mp4/i.test(b.mime || "") ? ".mp4" : ".webm"; }
    function tenFile(b) { return "checkinbds-" + global.Anh.khongDau(it.dc) + "-ban" + b.so + duoi(b); }
    function timBan(id) { return BAN.filter(function (x) { return x.id === id; })[0]; }

    var box = document.getElementById("studio");
    box.addEventListener("click", function (ev) {
      var t = ev.target;
      var xem = t.closest("[data-xemban]");
      if (xem) {
        var id = xem.getAttribute("data-xemban"), o = document.getElementById("vb-" + id), bl = blobs[id];
        if (!o || !bl) return;
        if (o.firstChild) { o.innerHTML = ""; return; }
        if (!URL_BAN[id]) URL_BAN[id] = URL.createObjectURL(bl);
        o.innerHTML = '<video controls playsinline autoplay src="' + URL_BAN[id] + '"></video>';
        return;
      }
      var th = t.closest("[data-thich]");
      if (th) {
        var b = timBan(th.getAttribute("data-thich"));
        if (!b) return;
        b.thich = !b.thich;
        suaBan(b).then(function () { giuCuon(); C.toast(b.thich ? "Đã đánh dấu ★ Bản " + b.so : "Đã bỏ đánh dấu"); });
        return;
      }
      var gui = t.closest("[data-guiban]");
      if (gui) {
        var b2 = timBan(gui.getAttribute("data-guiban")), bl2 = b2 && blobs[b2.id];
        if (!bl2) { C.toast("Video chưa tải xong, chạm lại sau 1 giây"); return; }
        var cap = (it.bai && it.bai.tt != null) ? it.bai.tt : baiTt(C.tinh(it));
        try { navigator.clipboard.writeText(cap); } catch (er) { /* máy không cho copy */ }
        var file = null;
        try { file = new File([bl2], tenFile(b2), { type: bl2.type || "video/mp4" }); } catch (er) { file = null; }
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: "Video " + it.dc }).then(function () {
            C.toast("Chú thích TikTok đã được copy — dán vào ô mô tả", 4);
          }).catch(function () { /* anh bấm huỷ */ });
        } else {
          C.taiVe(bl2, tenFile(b2));
          C.toast("Máy không mở được bảng chia sẻ — đã tải file về. Chú thích đã được copy.", 5);
        }
        return;
      }
      var tai = t.closest("[data-taiban]");
      if (tai) {
        var b3 = timBan(tai.getAttribute("data-taiban"));
        if (b3 && blobs[b3.id]) { C.taiVe(blobs[b3.id], tenFile(b3)); C.toast("Đang tải " + tenFile(b3)); }
        return;
      }
      var dl = t.closest("[data-dunglai]");
      if (dl) {
        var b4 = timBan(dl.getAttribute("data-dunglai"));
        if (!b4 || !b4.cai) return;
        it.video = JSON.parse(JSON.stringify(b4.cai));
        C.ghiHoan();
        C.toast("Đã nạp cài đặt của Bản " + b4.so + " — chỉnh tiếp rồi xuất bản mới");
        location.hash = "#/video/" + it.id + "/dung";
        return;
      }
      var xo = t.closest("[data-xoaban]");
      if (xo) {
        if (xo.getAttribute("data-sure") !== "1") {
          xo.setAttribute("data-sure", "1"); xo.textContent = "Chạm lần nữa";
          setTimeout(function () { if (xo.isConnected) { xo.removeAttribute("data-sure"); xo.textContent = "Xoá"; } }, 4000);
          return;
        }
        xoaBan(xo.getAttribute("data-xoaban")).then(function () { C.toast("Đã xoá phiên bản"); giuCuon(); });
      }
    });
    var don = document.getElementById("v-don");
    if (don) don.addEventListener("click", function () {
      if (don.getAttribute("data-sure") !== "1") {
        don.setAttribute("data-sure", "1"); don.textContent = "Chạm lần nữa để xoá";
        setTimeout(function () { if (don.isConnected) { don.removeAttribute("data-sure"); don.textContent = "Xoá các bản chưa ưng ý"; } }, 4000);
        return;
      }
      var bo = banCua(it.id).filter(function (b) { return !b.thich; });
      Promise.all(bo.map(function (b) { return xoaBan(b.id); })).then(function () {
        C.toast("Đã xoá " + bo.length + " bản chưa ưng ý");
        giuCuon();
      });
    });
  }

  /* dọn video của tài sản đã xoá hẳn */
  function donMoCoi(coId) {
    BAN.filter(function (b) { return !coId[b.ts]; }).forEach(function (b) { xoaBan(b.id); });
  }
  function dungLuong() { return BAN.reduce(function (s, b) { return s + (b.size || 0); }, 0); }

  global.Studio = {
    nap: napBan, man: man, gan: gan, dung: dungXem, soBan: function (ts) { return banCua(ts).length; },
    donMoCoi: donMoCoi, dungLuong: dungLuong, tatCa: function () { return BAN.slice(); },
    // cho kiểm thử
    _keHoach: keHoach, _caiCua: caiCua, _veKhung: veKhung, _xuat: xuatVideo, _baiFb: baiFb, _baiTt: baiTt
  };
})(window);
