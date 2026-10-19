/* Service worker — cho app chạy được khi mất mạng và tự nhận bản mới.
   Mỗi lần sửa app: đổi PHIEN ở đây, ?v= trong index.html và PHIEN_BAN trong js/app.js. */
var PHIEN = "cibds-v6";
var V = "?v=6";
var FONT = "cibds-font-v1";
var VO = [
  "./",
  "index.html",
  "css/app.css" + V,
  "js/anh.js" + V,
  "js/app.js" + V,
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "checkinbds-brand.yaml"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();   // bản mới nhận quyền ngay, app tự nạp lại nếu anh không đang gõ
  e.waitUntil(
    caches.open(PHIEN).then(function (c) {
      return Promise.all(VO.map(function (u) {
        return c.add(new Request(u, { cache: "reload" })).catch(function () { /* thiếu 1 file không chặn cài đặt */ });
      }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) {
        if (k !== PHIEN && k !== FONT) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("message", function (e) {
  if (e.data === "skip") self.skipWaiting();   // cho các bản cũ còn gửi lệnh này
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Font Google: lấy từ cache trước, nền tự làm mới
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(FONT).then(function (c) {
        return c.match(req).then(function (hit) {
          var net = fetch(req).then(function (res) {
            if (res && res.ok) c.put(req, res.clone());
            return res;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Mở trang: luôn hỏi máy chủ bản mới nhất (bỏ qua bộ nhớ đệm 10 phút của GitHub), mất mạng thì dùng bản đã lưu
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then(function (res) {
        // trình duyệt không nhận trang "đã chuyển hướng" từ service worker — đóng gói lại cho sạch
        if (!res.redirected) return res;
        return res.blob().then(function (b) {
          return new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers });
        });
      }).catch(function () {
        return caches.match("index.html").then(function (r) { return r || caches.match("./"); });
      })
    );
    return;
  }

  // File của app: cache trước, có mạng thì âm thầm cập nhật
  e.respondWith(
    caches.open(PHIEN).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) c.put(req, res.clone());
          return res;
        });
        return hit || net;
      });
    })
  );
});
