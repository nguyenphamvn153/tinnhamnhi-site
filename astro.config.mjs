import sitemap from "@astrojs/sitemap";
import { readFileSync, readdirSync } from "node:fs";
import { defineConfig, fontProviders } from "astro/config";

import { responsiveContentImages } from "./scripts/rehype-responsive-images.mjs";

/**
 * Quét nội dung một lần lúc build để lấy ba thứ dùng cho sitemap:
 *   - lastmod của mỗi bài (ưu tiên updatedAt nếu thực sự mới hơn ngày đăng)
 *   - danh sách ảnh của mỗi bài, để khai vào sitemap cho Google Images
 *   - thẻ có dưới 2 bài, để loại khỏi sitemap vì đã đặt noindex
 */
const lastmodByPath = new Map();
const imagesByPath = new Map();
const tagCounts = new Map();

const toSlug = (s) =>
	s
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[đĐ]/g, "d")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

for (const dir of ["posts", "pages"]) {
	for (const file of readdirSync(new URL(`./src/content/${dir}`, import.meta.url))) {
		if (!file.endsWith(".md")) continue;
		const raw = readFileSync(new URL(`./src/content/${dir}/${file}`, import.meta.url), "utf8");
		const split = raw.indexOf("\n---", 4);
		const front = raw.slice(0, split);
		const body = raw.slice(split);
		if (/^draft: true/m.test(front)) continue;

		const path = `/${dir}/${file.replace(/\.md$/, "")}`;

		const published = front.match(/^publishedAt: (.+)$/m)?.[1]?.trim();
		const updated = front.match(/^updatedAt: (.+)$/m)?.[1]?.trim();
		// updatedAt của bài chưa từng sửa đều là mốc migrate khỏi EmDash (2026-04-16),
		// nên chỉ dùng nó khi là lần sửa thật sự sau đợt đó.
		const migratedAt = new Date("2026-04-17T00:00:00Z");
		let stamp = published ? new Date(published) : null;
		if (updated) {
			const u = new Date(updated);
			if (u > migratedAt && (!stamp || u > stamp)) stamp = u;
		}
		if (stamp) lastmodByPath.set(path, stamp);

		const imgs = new Set();
		const featured = front.match(/^featuredImage: "([^"]+)"/m)?.[1];
		if (featured) imgs.add(featured);
		for (const m of body.matchAll(/<img src="(\/uploads\/[^"]+)"/g)) imgs.add(m[1]);
		if (imgs.size) imagesByPath.set(path, [...imgs]);

		if (dir === "posts") {
			for (const m of front.matchAll(/^ {2}- "(.+)"$/gm)) {
				const slug = toSlug(m[1]);
				tagCounts.set(slug, (tagCounts.get(slug) ?? 0) + 1);
			}
		}
	}
}

/** Thẻ chỉ gắn 1 bài tạo ra trang mỏng — đặt noindex và loại khỏi sitemap. */
const thinTags = new Set([...tagCounts].filter(([, n]) => n < 2).map(([slug]) => slug));

export default defineConfig({
	site: "https://tinnhamnhi.com",
	trailingSlash: "never",
	build: { format: "directory", inlineStylesheets: "always" },
	integrations: [
		sitemap({
			// Trang 404 và các trang phân trang đã đặt noindex nên không đưa vào sitemap.
			filter: (page) => {
				if (page.includes("/404") || page.includes("/posts/trang/")) return false;
				const tag = new URL(page).pathname.match(/^\/tag\/([^/]+)/)?.[1];
				return !(tag && thinTags.has(tag));
			},
			namespaces: { image: true },
			serialize: (item) => {
				const path = new URL(item.url).pathname.replace(/\/$/, "");
				const lastmod = lastmodByPath.get(path);
				const images = imagesByPath.get(path);
				return {
					...item,
					...(lastmod ? { lastmod } : {}),
					...(images ? { img: images.map((url) => ({ url: new URL(url, "https://tinnhamnhi.com").href })) } : {}),
				};
			},
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Lora",
			cssVariable: "--font-serif",
			// Một độ đậm cho mỗi họ chữ: giữ tổng dung lượng font ngang bản cũ.
			weights: [600],
			styles: ["normal"],
			subsets: ["latin", "vietnamese"],
			fallbacks: ["Georgia", "Times New Roman", "serif"],
		},
		{
			provider: fontProviders.google(),
			name: "Be Vietnam Pro",
			cssVariable: "--font-sans",
			weights: [400],
			styles: ["normal"],
			subsets: ["latin", "vietnamese"],
			fallbacks: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
		},
		{
			// Chỉ dùng cho chữ số của chỉ mục — không preload.
			provider: fontProviders.google(),
			name: "Unbounded",
			cssVariable: "--font-display",
			weights: [900],
			styles: ["normal"],
			subsets: ["latin"],
			fallbacks: ["Trebuchet MS", "sans-serif"],
		},
	],
	markdown: {
		rehypePlugins: [responsiveContentImages],
		smartypants: false,
	},
	devToolbar: { enabled: false },
});
