# tinnhamnhi.com

Mã nguồn website [tinnhamnhi.com](https://tinnhamnhi.com) — blog tĩnh dựng bằng Astro.

Trước đây site chạy EmDash CMS trên Cloudflare Workers (nội dung trong D1, ảnh trong
R2). Nay toàn bộ nội dung nằm trong repo dưới dạng Markdown và site được build ra
HTML tĩnh, host trên HostGator.

## Bắt đầu

```bash
npm install
npm run dev
```

## Deploy

Tạo file `.env` ở gốc dự án (không commit):

```
FTP_HOST=ftp.tinnhamnhi.com
FTP_USER=tài-khoản-ftp
FTP_PASSWORD=mật-khẩu
FTP_REMOTE_DIR=/public_html
FTP_SECURE=true
```

Rồi:

```bash
npm run deploy
```

Script chỉ đẩy những file thay đổi so với lần trước (đối chiếu qua
`.deploy-manifest.json` lưu trên server).

Hướng dẫn chi tiết về cách viết bài, cấu trúc thư mục và các nguyên tắc kỹ thuật:
xem [AGENTS.md](AGENTS.md).
