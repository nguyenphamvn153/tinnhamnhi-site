# Bản lưu dữ liệu EmDash (một lần, 2026-09-05)

Nội dung xuất từ Cloudflare D1 của site cũ trước khi chuyển sang static, giữ lại
phòng khi cần đối chiếu. Nội dung bài viết thật sự đã nằm ở `src/content/` dưới
dạng Markdown — thư mục này chỉ là bản thô.

| File | Nội dung |
| --- | --- |
| `posts.json` | 37 bài, nội dung dạng Portable Text |
| `pages.json` | 2 trang tĩnh |
| `media.json` | metadata 270 file ảnh (tên, kích thước, alt, storage key) |
| `taxonomies.json`, `content_taxonomies.json` | rỗng — site cũ không có tag/chuyên mục |
| `options.json` | cài đặt site (tên, tagline, logo, URL) |
| `media-manifest.txt` | 155 ảnh thực sự được dùng, đã tải về `public/uploads/` |
| `missing-media.txt` | 99 ảnh được tham chiếu nhưng không tồn tại trong R2 (đã 404 sẵn từ trước) |

Không có thông tin đăng nhập hay dữ liệu cá nhân trong các file này (bảng `users`,
`credentials`, `auth_tokens` đã được bỏ qua khi xuất).
