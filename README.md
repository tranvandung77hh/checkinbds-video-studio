# Check in BDS Video Studio

App web cho điện thoại: quản lý danh sách tài sản, tính **biên an toàn MoS**, sinh **kịch bản video** và **prompt OpenMontage** chuẩn thương hiệu Check in BDS.

**Dùng ngay:** https://tranvandung77hh.github.io/checkinbds-video-studio/

## Làm được gì

- **Lưu danh sách tài sản** — thêm, sửa, nhân bản, xoá (có hoàn tác). Tự lưu khi đang sửa, không cần bấm nút.
- **Trạng thái** — Đang theo / Tạm dừng / Đã bán. Lọc một chạm, căn đã bán không tính vào thống kê.
- **Tính tự động** — MoS, chênh lệch, đơn giá/m², lợi suất cho thuê, thời gian hoàn vốn, scorecard 100 điểm.
- **Chặn số liệu giả** — thiếu giá thị trường thì app **không** sinh kịch bản, báo rõ thiếu gì và nhảy thẳng tới ô cần điền. Thiếu mục tuỳ chọn (giá thuê, BGĐ, số tầng) thì tự bỏ câu đó ra, không bịa số 0.
- **Sinh kịch bản** — cảnh có timecode, lời đọc, mô tả hình, tiêu đề hook, hashtag.
- **Sinh prompt OpenMontage** — khóa cứng màu, font, giọng đọc, số liệu theo Brand Guideline, kèm dòng cấm agent đưa số ngoài danh sách lên hình.
- **Chia sẻ thẳng** — nút Chia sẻ mở sheet của điện thoại, gửi kịch bản/prompt qua Zalo, Messenger, email.
- **Cài như app** — thêm vào màn hình chính, chạy được khi mất mạng.
- **Sao lưu** — tải file `.json`, nhập lại trên máy khác. App tự nhắc khi quá 7 ngày chưa sao lưu.

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

Trong `localStorage` của trình duyệt trên máy đang dùng. **Không gửi lên mạng, không có server, không ai khác đọc được.** Đổi máy, xoá dữ liệu trình duyệt hoặc dùng tab ẩn danh là mất — dùng mục **Sao lưu** để tải file `.json` định kỳ.

## Dùng với OpenMontage

1. Clone [videostudio_OpenMontage](https://github.com/tranvandung77hh/videostudio_OpenMontage)
2. Copy `checkinbds-brand.yaml` (có trong repo này) vào thư mục `styles/`
3. Mở Claude Code tại thư mục đó, dán prompt từ tab **Prompt** của tài sản cần làm video

## Cấu trúc

```
index.html              khung app
css/app.css             màu, font, layout theo Brand Guideline
js/app.js               dữ liệu, tính toán, sinh kịch bản + prompt
sw.js                   chạy offline, tự nhận bản mới
manifest.webmanifest    cài lên màn hình chính
icons/                  icon app (skyline + đường sóng, đỏ đô/vàng đồng)
checkinbds-brand.yaml   style khóa thương hiệu cho OpenMontage
```

Không framework, không build. Sửa file rồi push là xong — GitHub Pages tự deploy.

## Sửa app

Đổi `PHIEN` trong `sw.js` mỗi lần sửa (ví dụ `cibds-v1` → `cibds-v2`), máy khách sẽ hiện thông báo "Có bản mới".

---

Trần Văn Dũng · 0983.221911 · Check in BDS
MINH BẠCH – TOÀN DIỆN – HỖ TRỢ 24/7
