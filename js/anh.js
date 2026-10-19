/* Check in BDS Video Studio — kho ảnh tài sản
   Ảnh lưu trong IndexedDB của máy anh. Không gửi lên mạng.

   Chất lượng:
   - Ảnh có cạnh dài <= 2560px và nhẹ hơn 4MB  -> giữ NGUYÊN FILE GỐC, không nén lại.
   - Lớn hơn -> thu về cạnh dài 2560px, JPEG 92%, thu nhiều bước để không bị rỗ.
   - Thêm 1 ảnh nhỏ 480px để lướt danh sách cho mượt, không đụng tới ảnh gốc.
   2560px đủ nét cho video 1080x1920 và còn dư để zoom/pan trong Remotion. */
(function (global) {
  "use strict";

  var MAX = 2560;          // cạnh dài tối đa của ảnh gốc giữ lại
  var CHAT_LUONG = 0.92;   // chất lượng JPEG khi buộc phải nén
  var NGUONG_GIU_GOC = 4 * 1024 * 1024;
  var THUMB = 480;

  var TEN_DB = "cibds-anh";
  var db = null;
  var META = [];           // {id, ts, w, h, size, loai, goc, tao} — nằm sẵn trong bộ nhớ, không chứa ảnh
  var urlCache = {};

  /* ---------- IndexedDB ---------- */
  function mo() {
    return new Promise(function (ok, loi) {
      if (db) return ok(db);
      if (!global.indexedDB) return loi(new Error("Máy không hỗ trợ IndexedDB"));
      var r = indexedDB.open(TEN_DB, 1);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains("meta")) {
          var m = d.createObjectStore("meta", { keyPath: "id" });
          m.createIndex("ts", "ts", { unique: false });
        }
        if (!d.objectStoreNames.contains("file")) d.createObjectStore("file", { keyPath: "id" });
      };
      r.onsuccess = function () { db = r.result; ok(db); };
      r.onerror = function () { loi(r.error); };
    });
  }

  function tx(ten, che) {
    return mo().then(function (d) { return d.transaction(ten, che); });
  }

  function chay(req) {
    return new Promise(function (ok, loi) {
      req.onsuccess = function () { ok(req.result); };
      req.onerror = function () { loi(req.error); };
    });
  }

  function napMeta() {
    return tx("meta", "readonly").then(function (t) {
      return chay(t.objectStore("meta").getAll());
    }).then(function (ds) {
      META = (ds || []).sort(function (a, b) { return (a.tao || 0) - (b.tao || 0); });
      return META;
    }).catch(function () { META = []; return META; });
  }

  /* ---------- xử lý ảnh ---------- */
  function doc(blob) {
    if (global.createImageBitmap) {
      try {
        return createImageBitmap(blob, { imageOrientation: "from-image" });
      } catch (e) { /* trình duyệt cũ không nhận tham số, thử lại kiểu thường */ }
      return createImageBitmap(blob);
    }
    return new Promise(function (ok, loi) {
      var img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = loi;
      img.src = URL.createObjectURL(blob);
    });
  }

  function khung(w, h) {
    if (global.OffscreenCanvas) return new OffscreenCanvas(w, h);
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }

  function xuat(canvas, q) {
    if (canvas.convertToBlob) return canvas.convertToBlob({ type: "image/jpeg", quality: q });
    return new Promise(function (ok) { canvas.toBlob(ok, "image/jpeg", q); });
  }

  /* thu nhỏ nhiều bước: mỗi bước không quá 1/2 để ảnh không bị rỗ, vỡ nét */
  function thuNho(nguon, w0, h0, wDich, hDich, q) {
    var w = w0, h = h0, canvas = null, ve = nguon;
    while (w > wDich * 2) {
      w = Math.max(wDich, Math.round(w / 2));
      h = Math.max(hDich, Math.round(h / 2));
      canvas = khung(w, h);
      var cx = canvas.getContext("2d");
      cx.imageSmoothingEnabled = true;
      cx.imageSmoothingQuality = "high";
      cx.drawImage(ve, 0, 0, w, h);
      ve = canvas;
    }
    var cuoi = khung(wDich, hDich);
    var c2 = cuoi.getContext("2d");
    c2.imageSmoothingEnabled = true;
    c2.imageSmoothingQuality = "high";
    c2.drawImage(ve, 0, 0, wDich, hDich);
    return xuat(cuoi, q);
  }

  function them(file, ts) {
    var meta = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      ts: ts, tao: Date.now(), ten: file.name || "anh.jpg", loai: file.type || "image/jpeg"
    };
    var goc = null, thumb = null;

    return doc(file).then(function (bmp) {
      var w = bmp.width, h = bmp.height, dai = Math.max(w, h);
      var giuGoc = dai <= MAX && file.size <= NGUONG_GIU_GOC && /image\/(jpeg|png|webp)/i.test(file.type);

      var b1 = giuGoc
        ? Promise.resolve(file)
        : (function () {
            var r = Math.min(1, MAX / dai);
            var nw = Math.max(1, Math.round(w * r)), nh = Math.max(1, Math.round(h * r));
            meta.w = nw; meta.h = nh;
            return thuNho(bmp, w, h, nw, nh, CHAT_LUONG);
          })();

      if (giuGoc) { meta.w = w; meta.h = h; meta.goc = true; }

      var tr = Math.min(1, THUMB / dai);
      var tw = Math.max(1, Math.round(w * tr)), th = Math.max(1, Math.round(h * tr));
      var b2 = thuNho(bmp, w, h, tw, th, 0.82);

      return Promise.all([b1, b2]).then(function (r) {
        goc = r[0]; thumb = r[1];
        if (bmp.close) bmp.close();
      });
    }).catch(function () {
      // Không giải mã được (ví dụ HEIC trên máy không hỗ trợ) — vẫn giữ nguyên file gốc
      goc = file; thumb = null; meta.goc = true; meta.khongXem = true;
    }).then(function () {
      meta.size = goc.size;
      return tx(["meta", "file"], "readwrite").then(function (t) {
        t.objectStore("meta").put(meta);
        t.objectStore("file").put({ id: meta.id, goc: goc, thumb: thumb });
        return new Promise(function (ok, loi) {
          t.oncomplete = function () { META.push(meta); ok(meta); };
          t.onerror = function () { loi(t.error); };
          t.onabort = function () { loi(t.error || new Error("Hết dung lượng")); };
        });
      });
    });
  }

  function xoa(id) {
    return tx(["meta", "file"], "readwrite").then(function (t) {
      t.objectStore("meta").delete(id);
      t.objectStore("file").delete(id);
      return new Promise(function (ok) {
        t.oncomplete = function () {
          META = META.filter(function (m) { return m.id !== id; });
          if (urlCache[id]) { URL.revokeObjectURL(urlCache[id]); delete urlCache[id]; }
          ok();
        };
      });
    });
  }

  function xoaTheoTaiSan(ts) {
    var ds = cua(ts).map(function (m) { return m.id; });
    return Promise.all(ds.map(xoa));
  }

  function layFile(id) {
    return tx("file", "readonly").then(function (t) {
      return chay(t.objectStore("file").get(id));
    });
  }

  function urlThumb(id) {
    if (urlCache[id]) return Promise.resolve(urlCache[id]);
    return layFile(id).then(function (f) {
      if (!f) return null;
      var b = f.thumb || f.goc;
      if (!b) return null;
      urlCache[id] = URL.createObjectURL(b);
      return urlCache[id];
    });
  }

  function urlGoc(id) {
    return layFile(id).then(function (f) { return f && f.goc ? URL.createObjectURL(f.goc) : null; });
  }

  function cua(ts) {
    return META.filter(function (m) { return m.ts === ts; });
  }

  function dem(ts) { return cua(ts).length; }

  function dungLuong(ts) {
    return (ts ? cua(ts) : META).reduce(function (s, m) { return s + (m.size || 0); }, 0);
  }

  /* ---------- CRC32 ---------- */
  var TBL = null;
  function bang() {
    if (TBL) return TBL;
    TBL = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TBL[n] = c >>> 0;
    }
    return TBL;
  }
  function crc32(u8) {
    var t = bang(), c = 0xffffffff;
    for (var i = 0; i < u8.length; i++) c = t[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  /* ---------- ZIP (chỉ lưu, không nén — ảnh JPEG nén sẵn rồi) ---------- */
  function gioDos(d) {
    return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2)) & 0xffff;
  }
  function ngayDos(d) {
    return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  }

  function taoZip(muc) {
    // muc: [{ten, blob}]
    return Promise.all(muc.map(function (m) {
      return (m.blob.arrayBuffer ? m.blob.arrayBuffer() : new Response(m.blob).arrayBuffer())
        .then(function (ab) { return { ten: m.ten, u8: new Uint8Array(ab) }; });
    })).then(function (ds) {
      var enc = new TextEncoder(), phan = [], trung = [], off = 0, d = new Date();
      var gio = gioDos(d), ng = ngayDos(d);

      ds.forEach(function (f) {
        var ten = enc.encode(f.ten), crc = crc32(f.u8), n = f.u8.length;
        var lh = new Uint8Array(30 + ten.length), v = new DataView(lh.buffer);
        v.setUint32(0, 0x04034b50, true);
        v.setUint16(4, 20, true);
        v.setUint16(6, 0x0800, true);   // tên file mã UTF-8
        v.setUint16(8, 0, true);        // không nén
        v.setUint16(10, gio, true); v.setUint16(12, ng, true);
        v.setUint32(14, crc, true); v.setUint32(18, n, true); v.setUint32(22, n, true);
        v.setUint16(26, ten.length, true); v.setUint16(28, 0, true);
        lh.set(ten, 30);
        phan.push(lh, f.u8);

        var ch = new Uint8Array(46 + ten.length), v2 = new DataView(ch.buffer);
        v2.setUint32(0, 0x02014b50, true);
        v2.setUint16(4, 20, true); v2.setUint16(6, 20, true);
        v2.setUint16(8, 0x0800, true); v2.setUint16(10, 0, true);
        v2.setUint16(12, gio, true); v2.setUint16(14, ng, true);
        v2.setUint32(16, crc, true); v2.setUint32(20, n, true); v2.setUint32(24, n, true);
        v2.setUint16(28, ten.length, true);
        v2.setUint32(42, off, true);
        ch.set(ten, 46);
        trung.push(ch);

        off += lh.length + n;
      });

      var cdSize = trung.reduce(function (s, x) { return s + x.length; }, 0);
      var eo = new Uint8Array(22), v3 = new DataView(eo.buffer);
      v3.setUint32(0, 0x06054b50, true);
      v3.setUint16(8, ds.length, true); v3.setUint16(10, ds.length, true);
      v3.setUint32(12, cdSize, true); v3.setUint32(16, off, true);

      return new Blob(phan.concat(trung, [eo]), { type: "application/zip" });
    });
  }

  function docZip(blob) {
    return (blob.arrayBuffer ? blob.arrayBuffer() : new Response(blob).arrayBuffer()).then(function (ab) {
      var dv = new DataView(ab), eocd = -1;
      for (var i = ab.byteLength - 22; i >= 0; i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
      }
      if (eocd < 0) throw new Error("Không phải file zip");
      var so = dv.getUint16(eocd + 10, true), p = dv.getUint32(eocd + 16, true);
      var dec = new TextDecoder(), ra = [];
      for (var k = 0; k < so; k++) {
        if (dv.getUint32(p, true) !== 0x02014b50) break;
        var pp = dv.getUint16(p + 10, true);
        var cs = dv.getUint32(p + 20, true);
        var nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
        var lho = dv.getUint32(p + 42, true);
        var ten = dec.decode(new Uint8Array(ab, p + 46, nl));
        var lnl = dv.getUint16(lho + 26, true), lel = dv.getUint16(lho + 28, true);
        var dOff = lho + 30 + lnl + lel;
        ra.push({ ten: ten, nen: pp, bytes: new Uint8Array(ab, dOff, cs) });
        p += 46 + nl + el + cl;
      }
      return ra;
    });
  }

  function giaiNen(muc) {
    if (muc.nen === 0) return Promise.resolve(muc.bytes);
    if (!global.DecompressionStream) return Promise.reject(new Error("Máy không giải nén được zip này"));
    var s = new Blob([muc.bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(s).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }

  function khongDau(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 48) || "tai-san";
  }

  function duoi(m) {
    if (/png/i.test(m.loai)) return ".png";
    if (/webp/i.test(m.loai)) return ".webp";
    if (/heic|heif/i.test(m.loai)) return ".heic";
    return ".jpg";
  }

  /* zip ảnh của 1 tài sản — tên thư mục khớp với prompt OpenMontage */
  function zipTaiSan(ts, tenTaiSan) {
    var ds = cua(ts);
    if (!ds.length) return Promise.reject(new Error("Chưa có ảnh"));
    var thuMuc = "anh-" + khongDau(tenTaiSan);
    return Promise.all(ds.map(function (m, i) {
      return layFile(m.id).then(function (f) {
        return { ten: thuMuc + "/" + ("0" + (i + 1)).slice(-2) + "-" + khongDau(tenTaiSan) + duoi(m), blob: f.goc };
      });
    })).then(taoZip);
  }

  /* zip toàn bộ: so-lieu.json + ảnh từng tài sản */
  function zipTatCa(items, json) {
    var muc = [{ ten: "so-lieu.json", blob: new Blob([json], { type: "application/json" }) }];
    var viec = items.map(function (it) {
      var ds = cua(it.id);
      if (!ds.length) return Promise.resolve();
      var thuMuc = "anh-" + khongDau(it.dc) + "-" + it.id;
      return Promise.all(ds.map(function (m, i) {
        return layFile(m.id).then(function (f) {
          if (f && f.goc) muc.push({ ten: thuMuc + "/" + ("0" + (i + 1)).slice(-2) + "-" + m.id + duoi(m), blob: f.goc });
        });
      }));
    });
    return Promise.all(viec).then(function () { return taoZip(muc); });
  }

  /* nhập lại từ zip: trả về {json, anh:[{tsId, blob, ten}]} */
  function docZipSaoLuu(blob) {
    return docZip(blob).then(function (ds) {
      var json = null, anh = [];
      var viec = ds.map(function (m) {
        if (/(^|\/)so-lieu\.json$/i.test(m.ten)) {
          return giaiNen(m).then(function (u8) { json = new TextDecoder().decode(u8); });
        }
        var kh = m.ten.match(/anh-.*?-([a-z0-9]+)\/([^/]+)$/i);
        if (!kh || !/\.(jpe?g|png|webp|heic)$/i.test(m.ten)) return Promise.resolve();
        return giaiNen(m).then(function (u8) {
          anh.push({ tsId: kh[1], ten: kh[2], blob: new Blob([u8], { type: "image/jpeg" }) });
        });
      });
      return Promise.all(viec).then(function () { return { json: json, anh: anh }; });
    });
  }

  function themBlob(blob, ts, ten) {
    var f = blob;
    try { f = new File([blob], ten || "anh.jpg", { type: blob.type || "image/jpeg" }); } catch (e) { /* trình duyệt cũ */ }
    return them(f, ts);
  }

  /* giữ dữ liệu không bị hệ điều hành dọn khi máy đầy */
  function giuBen() {
    if (!navigator.storage || !navigator.storage.persist) return Promise.resolve(false);
    return navigator.storage.persist().catch(function () { return false; });
  }
  function daGiuBen() {
    if (!navigator.storage || !navigator.storage.persisted) return Promise.resolve(false);
    return navigator.storage.persisted().catch(function () { return false; });
  }
  function conLai() {
    if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
    return navigator.storage.estimate().catch(function () { return null; });
  }

  global.Anh = {
    nap: napMeta, them: them, themBlob: themBlob, xoa: xoa, xoaTheoTaiSan: xoaTheoTaiSan,
    cua: cua, dem: dem, dungLuong: dungLuong, tatCa: function () { return META.slice(); },
    urlThumb: urlThumb, urlGoc: urlGoc, layFile: layFile,
    zipTaiSan: zipTaiSan, zipTatCa: zipTatCa, docZipSaoLuu: docZipSaoLuu,
    khongDau: khongDau, giuBen: giuBen, daGiuBen: daGiuBen, conLai: conLai,
    MAX: MAX
  };
})(window);
