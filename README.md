# Check in BDS Video Studio

App web cho điện thoại: quản lý danh sách tài sản, tính **biên an toàn MoS**, **dựng video ngay trên điện thoại** từ ảnh tài sản, soạn bài đăng, và sinh **prompt OpenMontage** chuẩn thương hiệu Check in BDS.

**Dùng ngay:** https://tranvandung77hh.github.io/checkinbds-video-studio/

Thanh dưới đáy: **Tài sản · Thêm · Video · Cài đặt**.

## Tab Video — dựng video trên điện thoại

Vẽ từng khung lên canvas rồi ghi thành video bằng MediaRecorder. Không cần máy chủ, không tốn API.

- **Xem thử tức thì** — mỗi thay đổi hiện ngay trên khung xem, không phải xuất mới biết.
- **3 phương án nhanh** — Sang trọng (4,5 giây/ảnh, zoom, mờ dần) · Nhanh — TikTok (2 giây/ảnh, lia, cắt thẳng, chữ to) · Tối giản (ảnh đứng yên, ít chữ).
- **Dòng thời gian** — sửa câu mở đầu, sửa chữ từng ảnh, đổi thứ tự ▲▼, bỏ ảnh / thêm lại, bật tắt bảng MoS và cảnh cuối.
- **Chuyển động** zoom chậm / lia ngang / đứng yên · **chuyển cảnh** mờ dần / cắt thẳng / trượt · **nhịp** 1,5–6 giây mỗi ảnh.
- **Chữ** cỡ nhỏ/vừa/lớn, vị trí trên/giữa/dưới, logo + số điện thoại góc trên.
- **Khung** dọc 9:16 (TikTok, Reels) · vuông 1:1 (Facebook) · ngang 16:9 (YouTube) · **chất lượng** 1080p hoặc 720p.
- **Thu giọng theo hình** — video chạy trên màn hình, câu cần đọc của từng cảnh hiện chữ to (số đọc thành chữ: "18 phẩy 6 tỷ"). Đếm 3-2-1, thu đúng bằng độ dài video rồi tự dừng, nên giọng khớp từng cảnh khi xuất. Nghe lại, thu lại, hoặc dùng. Đổi nhịp video sau khi thu thì app báo "giọng lệch hình".
- **Âm thanh** — hoặc gắn nhạc / giọng đọc từ file trong máy, chỉnh âm lượng, tự nhỏ dần 1 giây cuối.
- **Chữ dài** — tự thu nhỏ cho vừa khung; dài quá thì báo ngay dưới ô gõ trước khi xuất.
- **Ảnh chụp thêm** sau khi đã chỉnh video tự vào cuối video; ảnh anh đã bỏ thì vẫn nằm ngoài.
- **Xuất video** MP4 H.264 (iPhone và Chrome mới), lưu thành từng phiên bản.
- **Đã lưu** — xem lại, đánh dấu ★ bản ưng ý, gửi thẳng sang TikTok/Zalo (chú thích tự copy sẵn), tải file, dựng lại từ một bản cũ, xoá các bản chưa ưng ý.
- **Bài đăng** — bài Facebook đủ khối (tiêu đề, thông tin, phân tích giá, CTA, miễn trừ, hashtag) và chú thích TikTok ngắn; sửa tới đâu tự lưu tới đó. Chỉ dùng số liệu anh đã nhập, **không bao giờ đưa ghi chú riêng vào bài**.

Cảnh trong video: câu mở đầu vàng đồng trên ảnh bìa → ảnh có chữ → bảng MoS (số đếm lên, có dòng miễn trừ) → cảnh cuối đỏ đô với số điện thoại và tagline.

## Làm được gì

- **Lưu danh sách tài sản** — thêm, sửa, nhân bản, xoá (có hoàn tác). Tự lưu khi đang sửa, không cần bấm nút.
- **Trạng thái** — Đang theo / Tạm dừng / Đã bán. Lọc một chạm, căn đã bán không tính vào thống kê.
- **Tính tự động** — MoS, chênh lệch, đơn giá/m², lợi suất cho thuê, thời gian hoàn vốn, scorecard 100 điểm.
- **Chặn số liệu giả** — thiếu giá thị trường thì app **không** sinh kịch bản, báo rõ thiếu gì và nhảy thẳng tới ô cần điền. Thiếu mục tuỳ chọn (giá thuê, BGĐ, số tầng) thì tự bỏ câu đó ra, không bịa số 0.
- **Sinh kịch bản** — cảnh có timecode, lời đọc, mô tả hình, tiêu đề hook, hashtag.
- **Sinh prompt OpenMontage** — khóa cứng màu, font, giọng đọc, số liệu theo Brand Guideline, kèm dòng cấm agent đưa số ngoài danh sách lên hình.
- **Ảnh tài sản** — chụp hoặc chọn nhiều ảnh một lần. Ảnh ≤2560px giữ **nguyên file gốc, không nén lại**; lớn hơn thì thu về 2560px, JPEG 92%, thu nhiều bước cho nét. Đặt ảnh bìa, xem toàn màn hình, tải cả bộ dạng `.zip` với tên thư mục khớp sẵn prompt OpenMontage.
- **Chia sẻ thẳng** — nút Chia sẻ mở sheet của điện thoại, gửi kịch bản/prompt qua Zalo, Messenger, email.
- **Cài như app** — thêm vào màn hình chính, chạy được khi mất mạng.
- **Sao lưu** — bản đầy đủ `.zip` (số liệu + ảnh gốc) hoặc chỉ số liệu `.json`. Nhập lại trên máy khác giữ nguyên từng byte ảnh. App tự nhắc khi quá 7 ngày chưa sao lưu, có nút xin hệ điều hành không tự dọn dữ liệu.

## Công thức

| Chỉ số | Công thức |
|---|---|
| MoS | `(Giá thị trường − Giá mua) / Giá thị trường × 100%` |
| Ngưỡng MoS | ≥20% tốt · 15–20% trung bình · <15% đàm phán lại |
| Lợi suất thuê | `(Giá thuê × 12) / Giá bán × 100%` |
| Hoàn vốn thuê | `Giá bán / (Giá thuê × 12)` |
| Scorecard | MoS 30 · Pháp lý 20 · Dòng tiền 20 · Vị trí 15 · Tiện ích 15 |
| Chưa có giá thuê | Bỏ mục dòng tiền, chấm trên thang 80 rồi quy đổi về 100 |

## Dữ liệu nằm ở đâu

Số liệu trong `localStorage`, ảnh và video đã xuất trong `IndexedDB` của trình duyệt trên máy đang dùng. **Không gửi lên mạng, không có server, không ai khác đọc được.** Đổi máy, xoá dữ liệu trình duyệt hoặc dùng tab ẩn danh là mất — dùng mục **Sao lưu** để tải file `.json` định kỳ.

## Dùng với OpenMontage

1. Clone [videostudio_OpenMontage](https://github.com/tranvandung77hh/videostudio_OpenMontage)
2. Copy `checkinbds-brand.yaml` (có trong repo này) vào thư mục `styles/`
3. Mở Claude Code tại thư mục đó, dán prompt từ tab **Prompt** của tài sản cần làm video

## Cấu trúc

```
index.html              khung app
css/app.css             màu, font, layout theo Brand Guideline
js/anh.js               kho ảnh IndexedDB, xử lý ảnh, đóng/mở gói zip
js/studio.js            phòng dựng video: vẽ khung, xem thử, ghi MP4, bài đăng, phiên bản
js/app.js               dữ liệu, tính toán, sinh kịch bản + prompt, điều hướng
sw.js                   chạy offline, tự nhận bản mới
manifest.webmanifest    cài lên màn hình chính
icons/                  icon app (skyline + đường sóng, đỏ đô/vàng đồng)
checkinbds-brand.yaml   style khóa thương hiệu cho OpenMontage
```

Không framework, không build. Sửa file rồi push là xong — GitHub Pages tự deploy.

## Sửa app

Mỗi lần sửa, tăng số phiên bản ở **3 chỗ** cho khớp nhau: `PHIEN_BAN` trong `js/app.js`, `?v=` trong `index.html`, `PHIEN` và `V` trong `sw.js`. Máy anh sẽ tự nhận bản mới khi mở app hoặc kéo app từ nền lên, không cần bấm gì. Số phiên bản hiện ở cuối danh sách tài sản và trong màn Cài đặt.

---

Trần Văn Dũng · 0983.221911 · Check in BDS
MINH BẠCH – TOÀN DIỆN – HỖ TRỢ 24/7
