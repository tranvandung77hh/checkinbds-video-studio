/* Service worker — cho app chạy được khi mất mạng.
   Đổi PHIEN mỗi lần sửa app để máy khách tự nhận bản mới. */
var PHIEN = "cibds-v3";
var FONT = "cibds-font-v1";
var VO = [
  "./",
  "index.html",
  "css/app.css",
  "js/app.js",
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
  if (e.data === "skip") self.skipWaiting();
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

  // Điều hướng: ưu tiên mạng, mất mạng thì lấy index.html trong cache
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(function () {
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
