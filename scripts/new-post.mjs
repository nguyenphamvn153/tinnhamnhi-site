/**
 * Tạo khung một bài viết mới:  npm run new -- "Tiêu đề bài viết"
 * Sinh file src/content/posts/<slug>.md với frontmatter sẵn, đặt draft: true.
 */
import { writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const title = process.argv.slice(2).join(" ").trim();

if (!title) {
	console.error('Cách dùng: npm run new -- "Tiêu đề bài viết"');
	process.exit(1);
}

const slug = title
	.normalize("NFD")
	.replace(/[̀-ͯ]/g, "")
	.replace(/[đĐ]/g, "d")
	.toLowerCase()
	.replace(/[^a-z0-9]+/g, "-")
	.replace(/^-+|-+$/g, "");

const file = join(root, "src/content/posts", `${slug}.md`);
if (existsSync(file)) {
	console.error(`Đã có file ${slug}.md rồi.`);
	process.exit(1);
}

const body = `---
title: ${JSON.stringify(title)}
category: "chuyen-la"
tags:
  - "thẻ ví dụ"
excerpt: "Một hai câu tóm tắt, hiện ở trang chủ và khi chia sẻ lên mạng xã hội."
featuredImage: "/uploads/2026/01/ten-anh.webp"
publishedAt: ${new Date().toISOString()}
draft: true
---

Mở bài ở đây.

## Tiêu đề mục

Nội dung.
`;

writeFileSync(file, body, "utf8");
console.log(`Đã tạo src/content/posts/${slug}.md`);
console.log("URL sau khi publish: /posts/" + slug + "/");
console.log('Bỏ dòng `draft: true` khi muốn đăng.');
