/* Check in BDS Video Studio
   Dữ liệu nằm trong máy anh (localStorage), không gửi đi đâu.
   MoS = (Giá thị trường − Giá mua) / Giá thị trường × 100%  — theo SOP Check in BDS */
(function () {
  "use strict";

  /* ============ hằng số ============ */
  var NT = {
    tiktok: { ten: "TikTok", profile: "TikTok", res: "1080x1920", ar: "9:16", sec: 60 },
    reels: { ten: "Instagram Reels", profile: "Instagram Reels", res: "1080x1920", ar: "9:16", sec: 45 },
    shorts: { ten: "YouTube Shorts", profile: "YouTube Shorts", res: "1080x1920", ar: "9:16", sec: 60 },
    yt: { ten: "YouTube ngang", profile: "YouTube Landscape", res: "1920x1080", ar: "16:9", sec: 90 }
  };
  var DANG = {
    ban: { ten: "Bán tài sản cụ thể", pipeline: "animated-explainer", mode: "scene" },
    giaoduc: { ten: "Giáo dục tài chính — MoS / ROI", pipeline: "animated-explainer", mode: "scene" },
    cinematic: { ten: "Giới thiệu tài sản cinematic", pipeline: "cinematic", mode: "scene" },
    clip: { ten: "Cắt clip từ video dài", pipeline: "clip-factory", mode: "brief" },
    talking: { ten: "Talking head — anh tự quay", pipeline: "talking-head", mode: "brief" },
    dub: { ten: "Lồng tiếng Anh cho Việt kiều / expat", pipeline: "localization-dub", mode: "brief" }
  };
  var KH = {
    ndt: { ten: "Nhà đầu tư chuyên nghiệp", goc: "ROI, dòng tiền, biên an toàn, quyết định bằng số liệu", moi: "phân tích định lượng" },
    vk: { ten: "Việt kiều", goc: "cần đại diện tin cậy tại TP.HCM, pháp lý rõ, thanh khoản tốt", moi: "minh bạch pháp lý" },
    expat: { ten: "Chuyên gia nước ngoài", goc: "BĐS cao cấp, pháp lý rõ ràng, vị trí trung tâm", moi: "vị trí và pháp lý" },
    gd: { ten: "Giám đốc / chủ doanh nghiệp", goc: "tài sản xứng tầm, đầu tư dài hạn, không có thời gian tự tìm", moi: "tiết kiệm thời gian" },
    chame: { ten: "Cha mẹ mua nhà cho con", goc: "gần trường, an ninh, tiện ích gia đình, pháp lý sạch", moi: "an toàn cho gia đình" },
    tinh: { ten: "Người giàu tỉnh về TP.HCM", goc: "an cư kết hợp đầu tư, cần người hướng dẫn thị trường", moi: "dẫn đường thị trường" },
    tre: { ten: "Người trẻ kinh doanh thành công", goc: "căn đầu tiên thể hiện đẳng cấp, tích lũy tài sản lâu dài", moi: "cột mốc sở hữu" }
  };
  var PL = {
    so: { ten: "Sổ hồng riêng, hoàn công đầy đủ", ngan: "Sổ hồng riêng", diem: 20 },
    hd: { ten: "Hợp đồng mua bán công chứng", ngan: "Hợp đồng mua bán", diem: 12 },
    cho: { ten: "Đang chờ sổ / vướng hoàn công", ngan: "Đang chờ sổ", diem: 6 }
  };
  var MUC = { tot: { ten: "Tốt", diem: 15 }, kha: { ten: "Khá", diem: 10 }, tb: { ten: "Trung bình", diem: 6 } };
  var LOAI = ["Nhà phố", "Biệt thự", "Shophouse", "Căn hộ", "Đất nền"];
  var HUONG = ["Đông Nam", "Đông", "Nam", "Tây Nam", "Tây", "Tây Bắc", "Bắc", "Đông Bắc"];

  var REPO = "https://github.com/tranvandung77hh/videostudio_OpenMontage";
  var YAML_URL = "checkinbds-brand.yaml";

  /* ============ tiện ích ============ */
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };
  var n = function (v) { var x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) ? x : 0; };
  var f1 = function (v) { return (Math.round(v * 10) / 10).toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); };
  var f0 = function (v) { return Math.round(v).toLocaleString("vi-VN"); };
  var gio = function (t) {
    var d = new Date(t);
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  };
  var ngay = function (t) {
    var d = new Date(t);
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  function toast(html, giay, nut) {
    var box = $("toasts");
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = html;
    if (nut) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = nut.nhan;
      b.addEventListener("click", function () { el.remove(); nut.lam(); });
      el.appendChild(b);
    }
    box.appendChild(el);
    if (giay !== 0) setTimeout(function () { el.remove(); }, (giay || 2.4) * 1000);
    return el;
  }

  function copy(txt, nhan) {
    var xong = function () { toast("Đã copy " + esc(nhan || "")); };
    try {
      var p = navigator.clipboard.writeText(txt);
      if (p && p.then) p.then(xong, function () { toast("Máy không cho copy tự động — bấm giữ vào khối chữ để copy", 4); });
      else xong();
    } catch (e) { toast("Máy không cho copy tự động — bấm giữ vào khối chữ để copy", 4); }
  }

  /* ============ kho dữ liệu ============ */
  var KEY = "cibds.v1";
  var DB = { v: 1, items: [], cai: {} };

  function mau() {
    return {
      id: uid(), vd: true,
      dc: "Đường Số 7, Thảo Điền", khu: "Quận 2", loai: "Nhà phố",
      dt: 80, tang: 4, pn: 5, huong: "Đông Nam", pl: "so",
      gia: 14.5, tt: 18.6, bgd: 9.8, thue: 45, vt: "tot", ta: "tot",
      dang: "ban", nt: "tiktok", kh: "ndt",
      ghichu: "Ví dụ mẫu để xem luồng chạy. Anh xoá được bất cứ lúc nào.",
      tao: Date.now(), sua: Date.now()
    };
  }

  function doc() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && Array.isArray(d.items)) { DB = { v: 1, items: d.items, cai: d.cai || {} }; return; }
      }
    } catch (e) { /* bỏ qua, dùng mặc định */ }
    DB = { v: 1, items: [mau()], cai: {} };
    ghi();
  }

  function ghi() {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); return true; }
    catch (e) { toast("Máy không lưu được — kiểm tra dung lượng trình duyệt", 4); return false; }
  }

  function tim(id) {
    for (var i = 0; i < DB.items.length; i++) if (DB.items[i].id === id) return DB.items[i];
    return null;
  }

  function moi() {
    return {
      id: uid(), dc: "", khu: "", loai: "Nhà phố", dt: "", tang: "", pn: "", huong: "Đông Nam",
      pl: "so", gia: "", tt: "", bgd: "", thue: "", vt: "kha", ta: "kha",
      dang: "ban", nt: "tiktok", kh: "ndt", ghichu: "", tao: Date.now(), sua: Date.now()
    };
  }

  /* ============ tính toán ============ */
  function tinh(it) {
    var gia = n(it.gia), tt = n(it.tt), thue = n(it.thue), dt = n(it.dt);
    var mos = tt > 0 ? (tt - gia) / tt * 100 : 0;
    var yld = gia > 0 ? (thue * 12) / (gia * 1000) * 100 : 0;
    var c = {
      gia: gia, tt: tt, thue: thue, dt: dt, bgd: n(it.bgd),
      tang: n(it.tang), pn: n(it.pn),
      mos: mos, chenh: tt - gia, dongia: dt > 0 ? gia * 1000 / dt : 0,
      yld: yld, hv: yld > 0 ? 100 / yld : 0,
      pl: PL[it.pl] || PL.so, vt: MUC[it.vt] || MUC.kha, ta: MUC[it.ta] || MUC.kha,
      dang: DANG[it.dang] || DANG.ban, nt: NT[it.nt] || NT.tiktok, kh: KH[it.kh] || KH.ndt,
      dc: (it.dc || "").trim() || "Tài sản chưa đặt tên",
      khu: (it.khu || "").trim() || "TP.HCM",
      loai: it.loai || "Nhà phố", huong: it.huong || "Đông Nam",
      loaiVideo: it.dang || "ban", duLieu: tt > 0 && gia > 0
    };
    c.mosDiem = mos >= 20 ? 30 : (mos >= 15 ? 20 : 10);
    c.dtDiem = yld >= 6 ? 20 : (yld >= 4 ? 14 : (yld > 0 ? 8 : 0));
    c.diem = c.mosDiem + c.pl.diem + c.dtDiem + c.vt.diem + c.ta.diem;
    c.hang = c.mos >= 20 ? "tot" : (c.mos >= 15 ? "tb" : "rui");
    c.nhan = c.mos >= 20 ? "An toàn — đạt chuẩn 20%" : (c.mos >= 15 ? "Trung bình — cần đàm phán" : "Dưới chuẩn — đàm phán lại giá");
    c.chot = c.diem >= 80 ? "Nên mua — ưu tiên cao" : (c.diem >= 65 ? "Cân nhắc — đàm phán thêm" : "Đàm phán lại giá");
    c.chotHang = c.diem >= 80 ? "tot" : (c.diem >= 65 ? "tb" : "rui");
    return c;
  }

  /* ============ sinh kịch bản ============ */
  function canh(c) {
    var S = c.nt.sec, k = c.khu, gia = f1(c.gia), tt = f1(c.tt), mos = f1(c.mos);
    var t = function (p) { return Math.round(S * p); };
    if (c.loaiVideo === "cinematic") {
      return [
        [0, t(.15), "MỞ — KHÔNG LỜI", "(không thoại, chỉ nhạc nền trầm)",
          "Flycam hạ chậm xuống mặt tiền " + c.loai.toLowerCase() + " " + c.dc + ". Dải đỏ đô, chữ vàng đồng: tên đường."],
        [t(.15), t(.45), "KHÔNG GIAN", c.dc + ". " + c.dt + " mét vuông, " + c.tang + " tầng, hướng " + c.huong + ".",
          "Lia chậm qua phòng khách, cầu thang, sân thượng. Giữ mỗi khung 3 giây, không cắt nhanh."],
        [t(.45), t(.7), "GIÁ TRỊ", "Giá thị trường khu này " + tt + " tỷ. Căn này " + gia + " tỷ. Biên an toàn " + mos + " phần trăm.",
          "Stat card nền đỏ đô, số vàng đồng đếm lên. Đây là khung duy nhất có số liệu."],
        [t(.7), t(.88), "NGƯỜI MUA", "Dành cho " + c.kh.ten.toLowerCase() + " — " + c.kh.goc + ".",
          "Chân dung người xem nhà, bàn làm việc, ánh sáng chiều. Không cần thấy rõ mặt."],
        [t(.88), S, "CTA", "Trần Văn Dũng. Không chín tám ba, hai hai một, chín một một. Check in BDS.",
          "End card nền đỏ đô: MINH BẠCH – TOÀN DIỆN – HỖ TRỢ 24/7, số điện thoại vàng đồng."]
      ];
    }
    if (c.loaiVideo === "giaoduc") {
      return [
        [0, t(.1), "HOOK — SỐ LIỆU",
          "Hai người mua cùng một căn ở " + k + ". Một người lời " + f1(c.chenh) + " tỷ ngay lúc ký. Người kia không.",
          "Nền đỏ đô, hai con số vàng đồng đặt cạnh nhau. Chữ HOA Montserrat Bold."],
        [t(.1), t(.3), "VẤN ĐỀ",
          "Vì đa số trả đúng giá thị trường. Mua đúng giá nghĩa là không có biên an toàn nào cả. Thị trường đi ngang một năm là mình đứng im một năm.",
          "Biểu đồ đường giá đi ngang, điểm mua nằm ngay trên đường. Nền kem, chữ đỏ đô."],
        [t(.3), t(.5), "GIẢI QUYẾT SAI",
          "Nhiều người nghĩ cứ chờ giá giảm là xong. Nhưng ở " + k + " giá không giảm — chỉ có căn chủ cần bán gấp mới dưới giá.",
          "Minh họa phẳng: người ngồi chờ, lịch lật qua nhiều tháng. Tối giản, không hoạt hình quá đà."],
        [t(.5), t(.78), "GIẢI PHÁP — MoS",
          "Công thức: giá thị trường trừ giá mua, chia giá thị trường. Dưới mười lăm phần trăm thì đàm phán lại. Từ hai mươi trở lên mới xuống tiền. Căn em đang theo: " + mos + " phần trăm.",
          "Stat card: công thức MoS và ba ngưỡng 20 / 15–20 / dưới 15. Số vàng đồng trên nền đỏ đô."],
        [t(.78), S, "CTA",
          "Anh chị đang nhắm căn nào, gửi em địa chỉ với giá chào. Em tính biên an toàn cho, không tính phí.",
          "End card nền đỏ đô, tagline và số 0983.221911."]
      ];
    }
    return [
      [0, t(.1), "HOOK — SỐ LIỆU",
        c.loai + " " + c.dc + ". " + c.dt + " mét vuông, " + c.tang + " tầng. Giá thị trường " + tt + " tỷ. Chủ bán " + gia + " tỷ.",
        "Mặt tiền tài sản, số lớn vàng đồng trên dải đỏ đô một phần ba trên khung."],
      [t(.1), t(.28), "VẤN ĐỀ",
        "Phần lớn khách mua ở " + k + " trả đúng giá thị trường. Mua xong là hết biên an toàn, muốn bán lại phải chờ thị trường kéo.",
        "Biểu đồ so sánh: cột giá thị trường cao, cột giá căn này thấp hơn, phần chênh lệch tô vàng đồng."],
      [t(.28), t(.5), "GIẢI QUYẾT SAI",
        "Nhiều người xem hai ba căn thấy thích là chốt. Không tra bảng giá đất, không so năm tài sản tương đương trong bán kính một kilomet.",
        "Minh họa phẳng ba bước bị gạch đỏ. Nền kem, chữ đỏ đô."],
      [t(.5), t(.8), "GIẢI PHÁP — SỐ LIỆU",
        "Căn này: giá nhà nước " + f1(c.bgd) + " tỷ, giá thị trường " + tt + " tỷ, chủ bán " + gia + " tỷ. Biên an toàn " + mos +
        " phần trăm. Cho thuê " + f0(c.thue) + " triệu một tháng, lợi suất " + f1(c.yld) + " phần trăm. " + c.pl.ten + ".",
        "Stat card nền đỏ đô, bảng bốn dòng, số vàng đồng đếm lên. Giữ 3,5 giây."],
      [t(.8), S, "CTA",
        "Hợp với " + c.kh.ten.toLowerCase() + ". Gọi em xem nhà miễn phí. Trần Văn Dũng, không chín tám ba, hai hai một, chín một một.",
        "End card nền đỏ đô: MINH BẠCH – TOÀN DIỆN – HỖ TRỢ 24/7 và số điện thoại vàng đồng."]
    ];
  }

  function brief(c) {
    if (c.loaiVideo === "clip") return [
      "Pipeline này ăn video nguồn anh đã có — không sinh kịch bản sẵn.",
      "Đưa file video dài vào: buổi dẫn khách, livestream, video tư vấn. Agent cắt thành nhiều clip ngắn rồi xếp hạng theo độ hấp dẫn.",
      "Mỗi clip tự thêm phụ đề word-level, dải đỏ đô chữ vàng đồng, end card tagline.",
      "Việc của anh: duyệt danh sách clip, bỏ clip lộ thông tin khách hoặc giá chưa được phép công khai."
    ];
    if (c.loaiVideo === "talking") return [
      "Anh quay bằng điện thoại, dọc 9:16, ánh sáng từ cửa sổ, mic tai nghe là đủ.",
      "Nói theo năm bước: vấn đề → giải quyết sai → giải pháp → lợi ích → CTA inbox. Lấy mục Kịch bản làm dàn ý.",
      "Agent cắt khoảng lặng, thêm phụ đề word-level, chèn stat card MoS đúng màu thương hiệu, ghép end card.",
      "Chạy hoàn toàn trên CPU, không tốn API."
    ];
    return [
      "Dùng khi video tiếng Việt đã xong, cần bản tiếng Anh cho Việt kiều và chuyên gia nước ngoài.",
      "Agent tách tiếng, dịch, lồng tiếng Anh, khớp lại phụ đề. Giữ nguyên hình và end card.",
      "Bản tiếng Anh vẫn phải giữ câu miễn trừ: số liệu tham khảo tại thời điểm quay, không phải cam kết lợi nhuận.",
      "Cần key TTS (ElevenLabs hoặc Google) để giọng Anh nghe tự nhiên. Piper miễn phí nhưng giọng Anh hơi máy."
    ];
  }

  function hooks(c) {
    return [
      f1(c.chenh) + " TỶ CHÊNH LỆCH — CÙNG MỘT CĂN Ở " + c.khu.toUpperCase(),
      "CHỦ CẦN BÁN: " + c.loai.toUpperCase() + " " + c.dc.toUpperCase() + " DƯỚI GIÁ THỊ TRƯỜNG " + f1(c.mos) + "%",
      "CHO THUÊ " + f0(c.thue) + " TRIỆU/THÁNG — LỢI SUẤT " + f1(c.yld) + "%/NĂM, HOÀN VỐN " + f1(c.hv) + " NĂM",
      "BIÊN AN TOÀN " + f1(c.mos) + "% — CHUẨN MoS CHECK IN BDS CHỈ TƯ VẤN TỪ 20%",
      "GỌI NGAY XEM NHÀ MIỄN PHÍ — 0983.221911 | MINH BẠCH, TOÀN DIỆN, HỖ TRỢ 24/7"
    ];
  }

  function tags(c) {
    var kv = c.khu.replace(/\s+/g, ""), lh = c.loai.replace(/\s+/g, "");
    return ["#CheckInBDS", "#" + lh + kv, "#BanNha" + kv, "#DauTuBDS", "#BienAnToan20", "#MoS",
      "#NhaPhoDongTien", "#BDSTPHCM", "#" + kv, "#TranVanDung"].join("  ");
  }

  function kichBanText(c) {
    var txt;
    if (c.dang.mode === "brief") {
      txt = brief(c).map(function (x, i) { return (i + 1) + ". " + x; }).join("\n");
    } else {
      txt = canh(c).map(function (s) {
        return "[" + s[0] + "-" + s[1] + "s] " + s[2] + "\nLỜI: " + s[3] + "\nHÌNH: " + s[4];
      }).join("\n\n");
    }
    var h = hooks(c);
    return c.dang.ten.toUpperCase() + " — " + c.dc + ", " + c.khu + "\n" +
      c.nt.ten + " | " + c.nt.res + " | " + c.nt.sec + "s\n\n" + txt +
      "\n\n5 TIÊU ĐỀ HOOK\n" + h.map(function (x, i) { return (i + 1) + ". " + x; }).join("\n") +
      "\n\nHASHTAG\n" + tags(c);
  }

  function promptText(c) {
    var L = [];
    L.push("Dùng OpenMontage sản xuất 1 video cho thương hiệu Check in BDS.");
    L.push("");
    L.push("PIPELINE: " + c.dang.pipeline);
    L.push("STYLE: styles/checkinbds-brand.yaml — bắt buộc dùng, không tự đổi màu, font, nhịp.");
    L.push("PLATFORM PROFILE: " + c.nt.profile + " (" + c.nt.res + ", " + c.nt.ar + ")");
    L.push("THỜI LƯỢNG: " + c.nt.sec + " giây");
    L.push("NGÔN NGỮ: tiếng Việt" + (c.loaiVideo === "dub" ? ", dub sang tiếng Anh" : "") + ", phụ đề word-level burn-in");
    L.push("GIỌNG: nam trung niên, chuyên gia, ấm, chắc, không hype, không lên giọng bán hàng");
    L.push("");
    L.push("THƯƠNG HIỆU — KHÓA CỨNG, KHÔNG ĐƯỢC ĐỔI:");
    L.push("- Màu: đỏ đô #8B0E1A 60%, vàng đồng #D4A017 30%, trắng 10%, nền phụ kem #FDF4E7");
    L.push("- Font: Montserrat Bold tiêu đề chữ HOA, Montserrat Medium body, số liệu Montserrat 800 vàng đồng trên nền đỏ đô");
    L.push("- Logo góc trên phải, vùng bảo vệ bằng chiều cao chữ C, không glow, không gradient, không cắt xén");
    L.push("- Cảnh cuối: MINH BẠCH – TOÀN DIỆN – HỖ TRỢ 24/7 / Trần Văn Dũng – 0983.221911 / Check in BDS");
    L.push("- KHÔNG dùng: màu neon, pastel, màu ngoài bộ nhận diện, font trang trí, quá 3 font");
    L.push("");
    L.push("TÀI SẢN:");
    L.push("- " + c.loai + " " + c.dc + ", " + c.khu);
    L.push("- " + c.dt + " m², " + c.tang + " tầng, " + c.pn + " phòng ngủ, hướng " + c.huong);
    L.push("- Pháp lý: " + c.pl.ten);
    L.push("");
    L.push("SỐ LIỆU — CHỈ DÙNG ĐÚNG CÁC SỐ NÀY, KHÔNG TỰ SUY DIỄN, KHÔNG BỊA SỐ THỊ TRƯỜNG:");
    L.push("- Giá theo Bảng giá đất NQ87/2026: " + f1(c.bgd) + " tỷ");
    L.push("- Giá thị trường: " + f1(c.tt) + " tỷ");
    L.push("- Giá chủ bán: " + f1(c.gia) + " tỷ");
    L.push("- Chênh lệch: " + f1(c.chenh) + " tỷ");
    L.push("- MoS = (Giá thị trường − Giá mua) / Giá thị trường × 100% = " + f1(c.mos) + "%");
    L.push("- Đơn giá: " + f0(c.dongia) + " triệu/m²");
    L.push("- Cho thuê: " + f0(c.thue) + " triệu/tháng, lợi suất " + f1(c.yld) + "%/năm, hoàn vốn " + f1(c.hv) + " năm");
    L.push("- Scorecard: " + c.diem + "/100 (MoS " + c.mosDiem + "/30, pháp lý " + c.pl.diem + "/20, dòng tiền " +
      c.dtDiem + "/20, vị trí " + c.vt.diem + "/15, tiện ích " + c.ta.diem + "/15)");
    L.push("");
    L.push("KHÁCH MỤC TIÊU: " + c.kh.ten + " — " + c.kh.goc);
    L.push("Thông điệp cần chạm: " + c.kh.moi);
    L.push("");
    if (c.dang.mode === "scene") {
      L.push("KỊCH BẢN — GIỮ NGUYÊN THỨ TỰ VÀ TIMECODE:");
      canh(c).forEach(function (s) {
        L.push("[" + s[0] + "-" + s[1] + "s] " + s[2]);
        L.push("  LỜI: " + s[3]);
        L.push("  HÌNH: " + s[4]);
      });
    } else {
      L.push("YÊU CẦU THỰC HIỆN:");
      brief(c).forEach(function (x, i) { L.push((i + 1) + ". " + x); });
    }
    L.push("");
    L.push("BẮT BUỘC:");
    L.push("- Đúng 1 stat card số liệu MoS, giữ 3,5 giây, số đếm lên từ 0");
    L.push("- Phụ đề word-level, chữ trắng, chữ đang đọc tô vàng đồng, viền đỏ đô, cách đáy 18%");
    L.push('- Chèn dòng miễn trừ ở cảnh số liệu: "Số liệu tham khảo tại thời điểm quay, không phải cam kết lợi nhuận"');
    L.push("- KHÔNG nói: cam kết lợi nhuận, chắc chắn tăng giá, lãi x lần");
    L.push("- Dừng hỏi tôi duyệt ở: đề xuất, kịch bản, scene plan, asset đã sinh");
    L.push("");
    L.push("NGÂN SÁCH: tối đa 1,50 USD cho video này. Hỏi tôi trước khi gọi bất kỳ tool trả tiền trên 0,50 USD.");
    L.push("Ưu tiên tool miễn phí: Piper TTS cho giọng, Remotion cho stat card và chữ động, FFmpeg cho ghép và burn phụ đề.");
    L.push("");
    L.push("KIỂM TRA TRƯỚC KHI GIAO: ffprobe đúng " + c.nt.res +
      ", không khung đen, mức audio không clip, phụ đề có mặt, mọi con số trên hình khớp đúng danh sách số liệu trên.");
    return L.join("\n");
  }

  /* ============ mảnh dựng HTML ============ */
  function opt(list, val) {
    return list.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? " selected" : "") + ">" + esc(t) + "</option>";
    }).join("");
  }
  var keys = function (obj) {
    return Object.keys(obj).map(function (k) { return [k, obj[k].ten]; });
  };

  function fieldHTML(f, it) {
    var v = it[f.k];
    var cls = f.full ? "full" : "";
    var h = '<div class="' + cls + '"><label for="f-' + f.k + '">' + esc(f.l) + "</label>";
    if (f.t === "select") h += '<select id="f-' + f.k + '" data-k="' + f.k + '">' + opt(f.o, v) + "</select>";
    else if (f.t === "area") h += '<textarea id="f-' + f.k + '" data-k="' + f.k + '" placeholder="' + esc(f.ph || "") + '">' + esc(v) + "</textarea>";
    else if (f.t === "num") h += '<input id="f-' + f.k + '" data-k="' + f.k + '" inputmode="decimal" value="' + esc(v) + '" placeholder="' + esc(f.ph || "") + '">';
    else h += '<input id="f-' + f.k + '" data-k="' + f.k + '" value="' + esc(v) + '" placeholder="' + esc(f.ph || "") + '">';
    return h + "</div>";
  }

  var NHOM = [
    {
      ten: "Thông tin tài sản", f: [
        { k: "dc", l: "Địa chỉ / tên đường", t: "text", full: true, ph: "Đường Số 7, Thảo Điền" },
        { k: "khu", l: "Khu vực", t: "text", ph: "Quận 2" },
        { k: "loai", l: "Loại hình", t: "select", o: LOAI },
        { k: "dt", l: "Diện tích (m²)", t: "num", ph: "80" },
        { k: "tang", l: "Số tầng", t: "num", ph: "4" },
        { k: "pn", l: "Số phòng ngủ", t: "num", ph: "5" },
        { k: "huong", l: "Hướng", t: "select", o: HUONG },
        { k: "pl", l: "Pháp lý", t: "select", full: true, o: keys(PL) }
      ]
    },
    {
      ten: "Giá & dòng tiền", nhac: "Giá thị trường lấy từ nguồn thật: 5 tin rao bán tương đương bán kính 500m–1km, cộng giá giao dịch văn phòng đăng ký đất đai. Không ước lượng.",
      f: [
        { k: "gia", l: "Giá bán / chào (tỷ)", t: "num", ph: "14.5" },
        { k: "tt", l: "Giá thị trường (tỷ)", t: "num", ph: "18.6" },
        { k: "bgd", l: "Giá BGĐ NQ87 (tỷ)", t: "num", ph: "9.8" },
        { k: "thue", l: "Giá thuê (triệu/tháng)", t: "num", ph: "45" },
        { k: "vt", l: "Vị trí", t: "select", o: [["tot", "Tốt — mặt tiền, trung tâm"], ["kha", "Khá — hẻm xe hơi"], ["tb", "Trung bình — hẻm nhỏ"]] },
        { k: "ta", l: "Tiện ích", t: "select", o: [["tot", "Tốt — trường, chợ, bệnh viện gần"], ["kha", "Khá — đủ cơ bản"], ["tb", "Trung bình — thiếu"]] }
      ]
    },
    {
      ten: "Mục tiêu video", f: [
        { k: "dang", l: "Dạng video", t: "select", full: true, o: keys(DANG) },
        { k: "nt", l: "Nền tảng", t: "select", o: keys(NT) },
        { k: "kh", l: "Nhóm khách", t: "select", o: keys(KH) },
        { k: "ghichu", l: "Ghi chú riêng", t: "area", full: true, ph: "Chủ cần bán trước tháng 3, đã có 2 khách hỏi…" }
      ]
    }
  ];

  function formHTML(it) {
    return NHOM.map(function (g) {
      return '<div class="card"><h2>' + esc(g.ten) + "</h2>" +
        (g.nhac ? '<p class="hint">' + esc(g.nhac) + "</p>" : "") +
        '<div class="grid">' + g.f.map(function (f) { return fieldHTML(f, it); }).join("") + "</div></div>";
    }).join("");
  }

  function stripHTML(c) {
    return '<div class="strip">' +
      '<div class="mos"><b>' + (c.duLieu ? f1(c.mos) + "%" : "—") + "</b><span>MoS biên an toàn</span></div>" +
      '<div><span class="pill">' + esc(c.duLieu ? c.nhan : "Chưa đủ giá để tính") + "</span></div>" +
      '<div class="cells">' +
      '<div class="cell"><i>Chênh lệch</i><b>' + (c.duLieu ? f1(c.chenh) + " tỷ" : "—") + "</b></div>" +
      '<div class="cell"><i>Đơn giá</i><b>' + (c.dt > 0 && c.gia > 0 ? f0(c.dongia) + " tr/m²" : "—") + "</b></div>" +
      '<div class="cell"><i>Lợi suất thuê</i><b>' + (c.yld > 0 ? f1(c.yld) + "%/năm" : "—") + "</b></div>" +
      '<div class="cell"><i>Hoàn vốn thuê</i><b>' + (c.yld > 0 ? f1(c.hv) + " năm" : "—") + "</b></div>" +
      "</div></div>";
  }

  function scoreHTML(c) {
    var r = [
      ["Biên an toàn MoS", c.mosDiem, 30],
      ["Pháp lý — " + c.pl.ngan, c.pl.diem, 20],
      ["Dòng tiền cho thuê", c.dtDiem, 20],
      ["Vị trí — " + c.vt.ten, c.vt.diem, 15],
      ["Tiện ích — " + c.ta.ten, c.ta.diem, 15]
    ];
    return '<div class="card"><h2>Scorecard 100 điểm</h2>' +
      '<div class="score"><b>' + c.diem + "<small>/100</small></b>" +
      '<span class="badge b-' + c.chotHang + '">' + esc(c.chot) + "</span></div>" +
      '<div class="rows">' + r.map(function (x) {
        return '<div class="row"><span>' + esc(x[0]) +
          '<span class="bar-mini"><span style="width:' + Math.round(x[1] / x[2] * 100) + '%"></span></span></span>' +
          "<b>" + x[1] + "/" + x[2] + "</b></div>";
      }).join("") + "</div></div>";
  }

  /* ============ các màn hình ============ */
  function vDanhSach() {
    var q = (DB.cai.q || "").toLowerCase().trim();
    var sx = DB.cai.sx || "moi";
    var ds = DB.items.slice();
    if (q) ds = ds.filter(function (it) {
      return ((it.dc || "") + " " + (it.khu || "") + " " + (it.loai || "") + " " + (it.ghichu || "")).toLowerCase().indexOf(q) >= 0;
    });
    ds = ds.map(function (it) { return { it: it, c: tinh(it) }; });
    var sort = {
      moi: function (a, b) { return (b.it.sua || 0) - (a.it.sua || 0); },
      mos: function (a, b) { return b.c.mos - a.c.mos; },
      diem: function (a, b) { return b.c.diem - a.c.diem; },
      gia: function (a, b) { return a.c.gia - b.c.gia; }
    };
    ds.sort(sort[sx] || sort.moi);

    var tong = DB.items.length;
    var dat = 0, chenh = 0;
    DB.items.forEach(function (it) { var c = tinh(it); if (c.duLieu && c.mos >= 20) dat++; if (c.duLieu) chenh += c.chenh; });

    var h = '<div class="screen">';
    h += '<div class="tiles">' +
      '<div class="tile"><i>Tài sản</i><b>' + tong + "</b></div>" +
      '<div class="tile"><i>Đạt MoS 20%</i><b>' + dat + "</b></div>" +
      '<div class="tile"><i>Tổng chênh lệch</i><b>' + f1(chenh) + '<small> tỷ</small></b></div></div>';

    if (tong > 0) {
      h += '<div class="tools">' +
        '<input id="q" placeholder="Tìm địa chỉ, khu vực…" value="' + esc(DB.cai.q || "") + '" enterkeyhint="search">' +
        '<select id="sx" aria-label="Sắp xếp">' + opt([["moi", "Mới nhất"], ["mos", "MoS cao"], ["diem", "Điểm cao"], ["gia", "Giá thấp"]], sx) + "</select></div>";
    }

    if (!ds.length) {
      h += '<div class="card empty">' +
        '<svg viewBox="0 0 24 24" width="54" height="54" fill="currentColor"><path d="M4 10 12 4l8 6v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>' +
        "<h2>" + (q ? "Không tìm thấy tài sản" : "Chưa có tài sản nào") + "</h2>" +
        "<p>" + (q ? "Thử từ khoá khác, hoặc xoá ô tìm kiếm." : "Chạm nút cộng để thêm căn đầu tiên. Nhập giá bán và giá thị trường là có ngay MoS.") + "</p>" +
        (q ? "" : '<a class="btn" href="#/moi" style="max-width:220px;margin:14px auto 0">Thêm tài sản</a>') +
        "</div>";
    } else {
      h += '<div class="list">' + ds.map(function (x) {
        var it = x.it, c = x.c;
        return '<a class="item" href="#/ts/' + esc(it.id) + '">' +
          '<div class="item-top"><div style="flex:1;min-width:0">' +
          "<h3>" + esc(c.dc) + "</h3>" +
          '<p class="item-meta">' + esc(c.khu) + " · " + esc(c.loai) +
          (c.dt > 0 ? " · " + f0(c.dt) + " m²" : "") + "</p>" +
          (it.vd ? '<span class="chip vd">Ví dụ mẫu</span>' : "") +
          '<span class="chip">' + esc(c.dang.ten.split("—")[0].trim()) + "</span>" +
          "</div>" +
          '<span class="mos-chip c-' + c.hang + '">' + (c.duLieu ? f1(c.mos) + "%" : "—") + "</span></div>" +
          '<div class="item-num">' +
          "<div><i>Chủ bán</i><b>" + (c.gia > 0 ? f1(c.gia) + " tỷ" : "—") + "</b></div>" +
          "<div><i>Thị trường</i><b>" + (c.tt > 0 ? f1(c.tt) + " tỷ" : "—") + "</b></div>" +
          "<div><i>Điểm</i><b>" + c.diem + "/100</b></div>" +
          "</div></a>";
      }).join("") + "</div>";
    }
    h += "</div>";
    h += '<a class="fab" href="#/moi" aria-label="Thêm tài sản"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg></a>';
    return h;
  }

  function vChiTiet(id, tab) {
    var it = tim(id);
    if (!it) return '<div class="card empty"><h2>Không tìm thấy tài sản</h2><p>Có thể anh đã xoá nó rồi.</p><a class="btn" href="#/" style="max-width:220px;margin:14px auto 0">Về danh sách</a></div>';
    var c = tinh(it);
    tab = tab || "so";
    var h = '<div class="screen">';
    h += '<div class="seg" role="tablist">' +
      ["so,Số liệu", "kb,Kịch bản", "pr,Prompt"].map(function (x) {
        var k = x.split(",")[0], t = x.split(",")[1];
        return '<button type="button" role="tab" aria-selected="' + (tab === k) + '" data-tab="' + k + '" data-id="' + esc(id) + '">' + t + "</button>";
      }).join("") + "</div>";

    if (tab === "so") {
      h += stripHTML(c) + scoreHTML(c);
      h += '<div class="card"><h2>Chi tiết</h2><div class="rows">' +
        [["Loại hình", c.loai], ["Khu vực", c.khu],
         ["Diện tích", c.dt > 0 ? f0(c.dt) + " m²" : "—"],
         ["Kết cấu", (c.tang || "—") + " tầng · " + (c.pn || "—") + " PN · hướng " + c.huong],
         ["Pháp lý", c.pl.ten],
         ["Giá BGĐ NQ87", c.bgd > 0 ? f1(c.bgd) + " tỷ" : "—"],
         ["Cho thuê", c.thue > 0 ? f0(c.thue) + " tr/tháng" : "—"],
         ["Khách mục tiêu", c.kh.ten],
         ["Cập nhật", ngay(it.sua) + " " + gio(it.sua)]
        ].map(function (x) {
          return '<div class="row"><span>' + esc(x[0]) + "</span><b>" + esc(x[1]) + "</b></div>";
        }).join("") + "</div>" +
        (it.ghichu ? '<p class="hint" style="margin-top:12px;white-space:pre-wrap">' + esc(it.ghichu) + "</p>" : "") +
        "</div>";
      h += '<div class="btn-row">' +
        '<a class="btn alt" href="#/sua/' + esc(id) + '">Sửa</a>' +
        '<button class="btn alt" type="button" data-nhanban="' + esc(id) + '">Nhân bản</button></div>';
      h += '<button class="btn rui" type="button" data-xoa="' + esc(id) + '">Xoá tài sản</button>';
    }

    if (tab === "kb") {
      h += '<div class="card"><h2>' + esc(c.dang.ten) + "</h2>" +
        '<p class="hint">' + esc(c.nt.ten + " · " + c.nt.res + " · " + c.nt.ar + " · " + c.nt.sec + " giây · pipeline " + c.dang.pipeline) + "</p>";
      if (c.dang.mode === "brief") {
        h += '<div class="rows">' + brief(c).map(function (x) {
          return '<div class="row" style="grid-template-columns:1fr"><span>' + esc(x) + "</span></div>";
        }).join("") + "</div>";
      } else {
        h += canh(c).map(function (s) {
          return '<div class="scene"><div class="tc">' + s[0] + "–" + s[1] + ' giây</div><h3>' + esc(s[2]) +
            '</h3><div class="vo">' + esc(s[3]) + '</div><p class="vis"><b>Hình:</b> ' + esc(s[4]) + "</p></div>";
        }).join("");
      }
      h += "</div>";
      h += '<div class="card"><h2>5 tiêu đề hook</h2><ol class="hooks">' +
        hooks(c).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol></div>";
      h += '<div class="card"><h2>Hashtag</h2><p class="tags">' + esc(tags(c)) + "</p></div>";
      h += '<button class="btn" type="button" data-copy-kb="' + esc(id) + '">Copy toàn bộ kịch bản</button>';
    }

    if (tab === "pr") {
      h += '<div class="card"><h2>Prompt cho OpenMontage</h2>' +
        '<p class="hint">Mở Claude Code trong thư mục OpenMontage trên laptop rồi dán nguyên khối này. Màu, font, giọng đọc và số liệu đã khóa theo Brand Guideline.</p>' +
        "<pre>" + esc(promptText(c)) + "</pre>" +
        '<button class="btn" type="button" data-copy-pr="' + esc(id) + '">Copy prompt</button></div>';
      var paid = c.loaiVideo === "cinematic";
      var cost = paid
        ? [["Sinh video AI (fal.ai — Veo, Kling)", "0,50 – 1,20 USD"], ["Giọng đọc — Piper TTS", "0 USD"],
           ["Nhạc nền — thư viện mở", "0 USD"], ["Render Remotion + FFmpeg", "0 USD"], ["Tổng dự kiến", "0,50 – 1,20 USD"]]
        : [["Ảnh / video nguồn", "0 USD — anh tự chụp"], ["Giọng đọc — Piper TTS", "0 USD"],
           ["Stat card — Remotion", "0 USD"], ["Phụ đề + ghép — FFmpeg", "0 USD"], ["Tổng dự kiến", "0 USD"]];
      h += '<div class="card"><h2>Chi phí dự kiến</h2><div class="rows">' + cost.map(function (x) {
        return '<div class="row"><span>' + esc(x[0]) + "</span><b>" + esc(x[1]) + "</b></div>";
      }).join("") + "</div></div>";
    }
    return h + "</div>";
  }

  function vForm(id) {
    var it, them = !id;
    if (them) {
      it = moi();
      if (DB.cai.nhap) { try { it = Object.assign(it, JSON.parse(DB.cai.nhap)); } catch (e) { /* nháp lỗi, bỏ */ } }
    } else {
      it = tim(id);
      if (!it) return '<div class="card empty"><h2>Không tìm thấy tài sản</h2><a class="btn" href="#/" style="max-width:220px;margin:14px auto 0">Về danh sách</a></div>';
    }
    var h = '<div class="screen" id="form" data-id="' + esc(them ? "" : id) + '">';
    if (them) h += '<p class="hint">Điền được tới đâu lưu tới đó. Chỉ cần địa chỉ là lưu được, số liệu bổ sung sau.</p>';
    else h += '<p class="saved" id="saved">Tự lưu mỗi khi anh sửa</p>';
    h += formHTML(it);
    if (them) h += '<button class="btn" type="button" id="luu-moi">Lưu tài sản</button>';
    else h += '<a class="btn alt" href="#/ts/' + esc(id) + '">Xong</a>';
    return h + "</div>";
  }

  function vVanHanh() {
    var pipes = [
      ["<b>Bán 1 căn cụ thể</b><br>có địa chỉ, giá, MoS", "animated-explainer", "Ảnh anh tự chụp + Piper TTS — miễn phí"],
      ["<b>Giáo dục tài chính</b><br>MoS, ROI, so sánh kênh", "animated-explainer", "Chỉ cần số liệu — stat card Remotion"],
      ["<b>Teaser cinematic</b><br>tài sản hàng hiệu", "cinematic", "Cần key sinh video, ~0,5–1,2 USD"],
      ["<b>Cắt video dài</b><br>1 buổi dẫn khách → nhiều clip", "clip-factory", "File video nguồn. Chạy CPU, miễn phí"],
      ["<b>Anh tự quay nói chuyện</b>", "talking-head", "Video anh quay + phụ đề tự sinh"],
      ["<b>Bản tiếng Anh</b><br>Việt kiều, chuyên gia nước ngoài", "localization-dub", "Video tiếng Việt đã xong"],
      ["<b>Quay màn hình</b><br>hướng dẫn tra BGĐ, tính MoS", "screen-demo", "Bản ghi màn hình. Miễn phí"]
    ];
    var buoc = [
      'Cài <b>Python 3.10+</b>, <b>Node.js 18+</b>, <b>FFmpeg</b>. Chưa có FFmpeg: <code>winget install Gyan.FFmpeg</code>',
      'Clone repo: <code>git clone ' + REPO + '.git</code>',
      'PowerShell: <code>py -3 -m venv .venv</code> → <code>.\\.venv\\Scripts\\Activate.ps1</code> → <code>pip install -r requirements.txt</code> → <code>cd remotion-composer; npx --yes npm install</code> → <code>pip install piper-tts</code>',
      'Tải <a href="' + YAML_URL + '" download>checkinbds-brand.yaml</a> rồi copy vào thư mục <code>styles/</code> của repo.',
      "Mở Claude Code tại thư mục đó, dán prompt từ tab Prompt của từng tài sản. Agent dừng hỏi anh duyệt ở: đề xuất → kịch bản → cảnh → asset → render."
    ];
    return '<div class="screen">' +
      '<div class="card"><h2>Pipeline nào cho việc gì</h2><div class="scroll"><table>' +
      "<thead><tr><th>Việc của anh</th><th>Pipeline</th><th>Cần gì</th></tr></thead><tbody>" +
      pipes.map(function (p) { return "<tr><td>" + p[0] + "</td><td><code>" + p[1] + "</code></td><td>" + p[2] + "</td></tr>"; }).join("") +
      "</tbody></table></div></div>" +

      '<div class="card"><h2>Chạy lần đầu trên laptop</h2><div class="steps">' +
      buoc.map(function (b, i) { return '<div class="step"><i>' + (i + 1) + "</i><p>" + b + "</p></div>"; }).join("") +
      '</div><p class="hint" style="margin-top:12px">Laptop i5-8265U 8GB không GPU: chạy được nhánh miễn phí (Piper TTS + ảnh + Remotion + FFmpeg), render 60 giây khoảng 20–40 phút. Sinh video local cần GPU — thay bằng API key.</p></div>' +

      '<div class="card"><h2>Thương hiệu đã khóa</h2><div class="rows">' +
      [["Đỏ đô 60%", "#8B0E1A"], ["Vàng đồng 30%", "#D4A017"], ["Trắng 10%", "#FFFFFF"],
       ["Nền phụ kem", "#FDF4E7"], ["Tiêu đề", "Montserrat Bold HOA"], ["Số liệu", "Montserrat 800 vàng đồng"],
       ["Phụ đề", "Word-level, viền đỏ đô"], ["Cảnh cuối", "Tagline + 0983.221911"]
      ].map(function (x) { return '<div class="row"><span>' + esc(x[0]) + "</span><b>" + esc(x[1]) + "</b></div>"; }).join("") +
      '</div><p class="hint" style="margin-top:12px">Số liệu để vàng đồng trên nền đỏ đô theo guideline. Trên nền trắng chuyển sang đỏ đô vì vàng đồng trên trắng đọc không nổi — vẫn trong bộ màu chính thức.</p></div>' +

      '<div class="card"><h2>Công thức dùng trong app</h2><div class="rows">' +
      [["MoS", "(Giá TT − Giá mua) / Giá TT × 100%"],
       ["Ngưỡng MoS", "≥20% tốt · 15–20% TB · <15% đàm phán"],
       ["Lợi suất thuê", "(Thuê × 12) / Giá bán × 100%"],
       ["Hoàn vốn thuê", "Giá bán / (Thuê × 12)"],
       ["Scorecard", "MoS 30 · Pháp lý 20 · Dòng tiền 20 · Vị trí 15 · Tiện ích 15"]
      ].map(function (x) { return '<div class="row" style="grid-template-columns:auto 1fr;gap:12px"><b style="white-space:nowrap">' + esc(x[0]) + "</b><span style=\"text-align:right\">" + esc(x[1]) + "</span></div>"; }).join("") +
      "</div></div>" +
      '<p class="hint" style="text-align:center">Trần Văn Dũng · 0983.221911 · Check in BDS</p></div>';
  }

  function vSaoLuu() {
    var size = 0;
    try { size = (localStorage.getItem(KEY) || "").length; } catch (e) { /* bỏ qua */ }
    return '<div class="screen">' +
      '<div class="card"><h2>Dữ liệu của anh</h2>' +
      '<div class="rows">' +
      '<div class="row"><span>Số tài sản</span><b>' + DB.items.length + "</b></div>" +
      '<div class="row"><span>Dung lượng</span><b>' + (size / 1024).toFixed(1) + " KB</b></div>" +
      '<div class="row"><span>Nơi lưu</span><b>Máy này</b></div>' +
      "</div>" +
      '<p class="hint" style="margin-top:12px">Dữ liệu nằm trong trình duyệt của máy này, không gửi lên mạng. Đổi điện thoại, xoá dữ liệu trình duyệt hoặc dùng tab ẩn danh là mất — nên tải file sao lưu định kỳ.</p></div>' +

      '<div class="card"><h2>Tải về / mang sang máy khác</h2>' +
      '<button class="btn" type="button" id="tai">Tải file sao lưu (.json)</button>' +
      '<button class="btn alt" type="button" id="copy-json">Copy dữ liệu dạng chữ</button></div>' +

      '<div class="card"><h2>Nhập lại từ file</h2>' +
      '<p class="hint">Chọn file .json đã sao lưu. Tài sản trong file sẽ được thêm vào, không ghi đè cái đang có.</p>' +
      '<input type="file" id="file" accept=".json,application/json"></div>' +

      '<div class="card"><h2>Xoá sạch</h2>' +
      '<p class="hint">Xoá toàn bộ tài sản trong máy này. Không lấy lại được — tải file sao lưu trước đã.</p>' +
      '<button class="btn rui" type="button" id="xoa-het">Xoá toàn bộ dữ liệu</button></div>' +
      "</div>";
  }

  /* ============ điều hướng ============ */
  function route() {
    var h = (location.hash || "#/").replace(/^#/, "");
    var p = h.split("/").filter(Boolean);
    if (!p.length) return { t: "ds" };
    if (p[0] === "moi") return { t: "moi" };
    if (p[0] === "vh") return { t: "vh" };
    if (p[0] === "luu") return { t: "luu" };
    if (p[0] === "sua") return { t: "sua", id: p[1] };
    if (p[0] === "ts") return { t: "ts", id: p[1], tab: p[2] || "so" };
    return { t: "ds" };
  }

  var TIEU = {
    ds: ["Check in BDS Video Studio", "Minh bạch · Toàn diện · Hỗ trợ 24/7"],
    moi: ["Thêm tài sản", "Điền được tới đâu lưu tới đó"],
    vh: ["Vận hành", "Pipeline · cài đặt · công thức"],
    luu: ["Sao lưu", "Dữ liệu nằm trong máy anh"]
  };

  function ve() {
    var r = route(), app = $("app"), html, tieu, sub;
    if (r.t === "ds") { html = vDanhSach(); tieu = TIEU.ds[0]; sub = TIEU.ds[1]; }
    else if (r.t === "moi") { html = vForm(null); tieu = TIEU.moi[0]; sub = TIEU.moi[1]; }
    else if (r.t === "vh") { html = vVanHanh(); tieu = TIEU.vh[0]; sub = TIEU.vh[1]; }
    else if (r.t === "luu") { html = vSaoLuu(); tieu = TIEU.luu[0]; sub = TIEU.luu[1]; }
    else if (r.t === "sua") {
      var its = tim(r.id);
      html = vForm(r.id); tieu = "Sửa tài sản"; sub = its ? (its.dc || "Tài sản") : "";
    } else {
      var itd = tim(r.id), cd = itd ? tinh(itd) : null;
      html = vChiTiet(r.id, r.tab);
      tieu = cd ? cd.dc : "Tài sản";
      sub = cd ? (cd.khu + " · " + cd.loai + (cd.duLieu ? " · MoS " + f1(cd.mos) + "%" : "")) : "";
    }
    $("bar-title").textContent = tieu;
    $("bar-sub").textContent = sub;
    $("back").hidden = (r.t === "ds");
    app.innerHTML = html;
    Array.prototype.forEach.call(document.querySelectorAll("#tabs a"), function (a) {
      var k = a.getAttribute("data-nav");
      var on = (k === "/" && r.t === "ds") || (k === "/moi" && r.t === "moi") ||
        (k === "/vh" && r.t === "vh") || (k === "/luu" && r.t === "luu");
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
    if (r.t === "sua" || r.t === "moi") gan(r.t === "sua" ? r.id : null);
    if (r.t === "ds") ganDanhSach();
    if (r.t === "luu") ganSaoLuu();
  }

  /* ============ gắn sự kiện ============ */
  var hen = null;
  function gan(id) {
    var form = $("form");
    if (!form) return;
    form.addEventListener("input", function (e) {
      var k = e.target.getAttribute("data-k");
      if (!k) return;
      if (id) {
        var it = tim(id);
        if (!it) return;
        it[k] = e.target.value;
        it.sua = Date.now();
        if (it.vd) delete it.vd;
        clearTimeout(hen);
        hen = setTimeout(function () {
          if (ghi() && $("saved")) $("saved").textContent = "Đã lưu " + gio(Date.now());
        }, 350);
      } else {
        var nhap = {};
        Array.prototype.forEach.call(form.querySelectorAll("[data-k]"), function (el) { nhap[el.getAttribute("data-k")] = el.value; });
        DB.cai.nhap = JSON.stringify(nhap);
        clearTimeout(hen);
        hen = setTimeout(ghi, 400);
      }
    });
    var btn = $("luu-moi");
    if (btn) btn.addEventListener("click", function () {
      var it = moi();
      Array.prototype.forEach.call(form.querySelectorAll("[data-k]"), function (el) { it[el.getAttribute("data-k")] = el.value; });
      if (!(it.dc || "").trim()) { toast("Nhập địa chỉ trước đã", 2.6); $("f-dc").focus(); return; }
      DB.items.unshift(it);
      delete DB.cai.nhap;
      ghi();
      toast("Đã lưu <b>" + esc(it.dc) + "</b>");
      location.hash = "#/ts/" + it.id;
    });
  }

  function ganDanhSach() {
    var q = $("q"), sx = $("sx");
    if (q) q.addEventListener("input", function () {
      DB.cai.q = q.value;
      clearTimeout(hen);
      hen = setTimeout(function () {
        ghi();
        var pos = q.selectionStart;
        ve();
        var q2 = $("q");
        if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (e) { /* bỏ qua */ } }
      }, 260);
    });
    if (sx) sx.addEventListener("change", function () { DB.cai.sx = sx.value; ghi(); ve(); });
  }

  function ganSaoLuu() {
    var tai = $("tai");
    if (tai) tai.addEventListener("click", function () {
      var txt = JSON.stringify({ v: 1, xuat: new Date().toISOString(), items: DB.items }, null, 2);
      var blob = new Blob([txt], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "checkinbds-taisan-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      toast("Đã tải file sao lưu");
    });
    var cj = $("copy-json");
    if (cj) cj.addEventListener("click", function () {
      copy(JSON.stringify({ v: 1, items: DB.items }), "dữ liệu");
    });
    var file = $("file");
    if (file) file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var d = JSON.parse(String(fr.result));
          var ds = Array.isArray(d) ? d : (d && d.items);
          if (!Array.isArray(ds)) throw new Error("sai định dạng");
          var them = 0;
          ds.forEach(function (x) {
            if (!x || typeof x !== "object") return;
            x.id = uid(); x.sua = x.sua || Date.now(); x.tao = x.tao || Date.now();
            DB.items.unshift(x); them++;
          });
          ghi();
          toast("Đã nhập thêm <b>" + them + "</b> tài sản");
          ve();
        } catch (e) { toast("File không đọc được — cần file .json do app này tải ra", 4); }
      };
      fr.readAsText(f);
    });
    var xh = $("xoa-het");
    if (xh) {
      var lan = 0;
      xh.addEventListener("click", function () {
        lan++;
        if (lan === 1) { xh.textContent = "Chạm lần nữa để xoá thật"; setTimeout(function () { lan = 0; xh.textContent = "Xoá toàn bộ dữ liệu"; }, 4000); return; }
        DB.items = []; DB.cai = {}; ghi();
        toast("Đã xoá toàn bộ dữ liệu");
        location.hash = "#/";
        ve();
      });
    }
  }

  /* hành động chung trong #app */
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("[data-tab],[data-xoa],[data-nhanban],[data-copy-kb],[data-copy-pr]") : null;
    if (!t) return;
    if (t.hasAttribute("data-tab")) {
      location.hash = "#/ts/" + t.getAttribute("data-id") + "/" + t.getAttribute("data-tab");
      return;
    }
    if (t.hasAttribute("data-copy-kb")) {
      var i1 = tim(t.getAttribute("data-copy-kb"));
      if (i1) copy(kichBanText(tinh(i1)), "kịch bản");
      return;
    }
    if (t.hasAttribute("data-copy-pr")) {
      var i2 = tim(t.getAttribute("data-copy-pr"));
      if (i2) copy(promptText(tinh(i2)), "prompt");
      return;
    }
    if (t.hasAttribute("data-nhanban")) {
      var i3 = tim(t.getAttribute("data-nhanban"));
      if (!i3) return;
      var ban = JSON.parse(JSON.stringify(i3));
      ban.id = uid(); ban.dc = (i3.dc || "Tài sản") + " (bản sao)"; ban.tao = Date.now(); ban.sua = Date.now();
      delete ban.vd;
      DB.items.unshift(ban); ghi();
      toast("Đã nhân bản");
      location.hash = "#/ts/" + ban.id;
      return;
    }
    if (t.hasAttribute("data-xoa")) {
      var id = t.getAttribute("data-xoa");
      if (t.getAttribute("data-sure") !== "1") {
        t.setAttribute("data-sure", "1");
        t.textContent = "Chạm lần nữa để xoá";
        setTimeout(function () { if (t.isConnected) { t.removeAttribute("data-sure"); t.textContent = "Xoá tài sản"; } }, 4000);
        return;
      }
      var xoa = tim(id);
      DB.items = DB.items.filter(function (x) { return x.id !== id; });
      ghi();
      var luu = xoa ? JSON.parse(JSON.stringify(xoa)) : null;
      toast("Đã xoá <b>" + esc(luu ? (luu.dc || "tài sản") : "tài sản") + "</b>", 6, luu ? {
        nhan: "Hoàn tác", lam: function () { DB.items.unshift(luu); ghi(); toast("Đã phục hồi"); ve(); }
      } : null);
      location.hash = "#/";
      ve();
    }
  });

  $("back").addEventListener("click", function () {
    if (history.length > 1) history.back(); else location.hash = "#/";
  });

  window.addEventListener("hashchange", ve);

  /* ============ PWA ============ */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        reg.addEventListener("updatefound", function () {
          var sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", function () {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              toast("Có bản mới", 0, { nhan: "Cập nhật", lam: function () { sw.postMessage("skip"); } });
            }
          });
        });
      }).catch(function () { /* không có SW cũng chạy bình thường */ });
      var daReload = false;
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (daReload) return; daReload = true; location.reload();
      });
    });
  }

  var caiDat = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    caiDat = e;
    if (DB.cai.anCai) return;
    toast("Cài lên màn hình chính?", 0, {
      nhan: "Cài", lam: function () {
        caiDat.prompt();
        DB.cai.anCai = 1; ghi();
      }
    });
  });

  /* ============ chạy ============ */
  doc();
  ve();
  if (!DB.cai.anCai && /iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone) {
    setTimeout(function () {
      toast("Chạm <b>Chia sẻ</b> → <b>Thêm vào MH chính</b> để dùng như app", 0, {
        nhan: "Hiểu rồi", lam: function () { DB.cai.anCai = 1; ghi(); }
      });
    }, 1800);
  }
})();
