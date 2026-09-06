# tinnhamnhi.com

Blog tĩnh chạy bằng **Astro 7**, nội dung là Markdown trong repo, deploy lên hosting
HostGator qua FTP. Không có CMS, không có database, không có PHP — toàn bộ site là
HTML/CSS/ảnh tĩnh.

## Lệnh

```bash
npm run dev                      # server dev ở http://localhost:4321
npm run build                    # tối ưu ảnh + build ra dist/
npm run preview                  # xem thử bản build
npm run new -- "Tiêu đề bài"     # tạo khung bài viết mới
npm run deploy:cf                # build rồi deploy thẳng lên Cloudflare (bản đang chạy)
npm run deploy:preview           # build rồi upload bản preview, KHÔNG đụng production
npm run deploy:ftp               # build rồi đẩy lên HostGator qua FTP (phương án dự phòng)
npm run typecheck                # astro check
node scripts/make-brand-assets.mjs   # sinh lại logo/favicon/ảnh OG khi đổi linh vật
```

## Viết bài mới

1. `npm run new -- "Tiêu đề"` → sinh `src/content/posts/<slug>.md`.
2. Ảnh bỏ vào `public/uploads/<năm>/<tháng>/`, tham chiếu bằng đường dẫn tuyệt đối
   (`/uploads/2026/01/anh.webp`). Biến thể responsive được sinh tự động lúc build.
3. Sửa nội dung, xoá dòng `draft: true`, chạy `npm run deploy:cf`.

Frontmatter của bài viết:

| Trường | Bắt buộc | Ghi chú |
| --- | --- | --- |
| `title` | có | |
| `category` | nên có | một trong các slug ở `src/site.config.ts` |
| `tags` | không | mảng chuỗi tiếng Việt có dấu, slug tự sinh |
| `excerpt` | nên có | dùng cho trang chủ, thẻ mô tả SEO và RSS |
| `featuredImage` | nên có | thiếu ảnh thì card hiển thị dạng chỉ có chữ |
| `publishedAt` | có | ISO 8601, quyết định thứ tự bài |
| `draft` | không | `true` thì không build ra |

## Cấu trúc

| Đường dẫn | Vai trò |
| --- | --- |
| `src/content/posts/*.md` | bài viết |
| `src/content/pages/*.md` | trang tĩnh (`/pages/<slug>/`) |
| `src/site.config.ts` | tên site, mô tả, danh sách chuyên mục, số bài mỗi trang |
| `src/layouts/Base.astro` | khung trang: header, footer, thẻ SEO, JSON-LD, dark mode |
| `src/styles/theme.css` | biến thiết kế + style dùng chung |
| `src/styles/prose.css` | kiểu chữ cho nội dung bài |
| `scripts/optimize-media.mjs` | sinh ảnh responsive, chạy trước mỗi lần build |
| `scripts/rehype-responsive-images.mjs` | gắn `srcset`/`width`/`height` vào ảnh trong bài |
| `brand/mascot.png` | linh vật shiba — nguồn của mọi ảnh thương hiệu |
| `scripts/make-brand-assets.mjs` | sinh logo, favicon, ảnh OG từ `brand/mascot.png` |
| `scripts/deploy.mjs` | đẩy `dist/` lên FTP, chỉ phần thay đổi |
| `scripts/import-from-emdash.mjs` | script migrate một lần từ EmDash cũ (giữ lại để tham khảo) |
| `public/_redirects`, `public/_headers` | redirect + header cho Cloudflare (bản đang chạy) |
| `hosting/htaccess` | cấu hình Apache, chỉ dùng khi deploy FTP lên HostGator |
| `wrangler.jsonc` | cấu hình Worker static assets trên Cloudflare |

## Nguyên tắc

- **Giữ nguyên URL.** `/posts/<slug>/`, `/pages/<slug>/`, `/rss.xml` là URL đã được
  index. Đổi slug là mất SEO — nếu buộc phải đổi, thêm redirect 301 vào `.htaccess`.
- **Không thêm JavaScript nếu không thật sự cần.** Hiện chỉ có ~15 dòng inline cho
  dark mode và nút chép liên kết. Không framework, không thư viện client.
- **Ảnh luôn có `width`/`height`** để trang không nhảy khi tải (CLS = 0). Dùng
  component `Img.astro` hoặc để rehype plugin tự xử lý ảnh trong Markdown.
- **Không có backend.** Mọi tính năng cần server (form, bình luận, tìm kiếm động)
  đều không dùng được — nếu cần thì dùng dịch vụ ngoài.
