import sitemap from "@astrojs/sitemap";
import { readFileSync, readdirSync } from "node:fs";
import { defineConfig, fontProviders } from "astro/config";

import { responsiveContentImages } from "./scripts/rehype-responsive-images.mjs";

/**
 * Ngày đăng của từng bài, để gắn <lastmod> vào sitemap.
 * Dùng publishedAt chứ không dùng updatedAt: updatedAt của mọi bài đều là mốc
 * migrate khỏi EmDash (2026-04-16), không phản ánh lần sửa nội dung thật nào.
 */
const lastmodByPath = new Map();
for (const dir of ["posts", "pages"]) {
	for (const file of readdirSync(new URL(`./src/content/${dir}`, import.meta.url))) {
		if (!file.endsWith(".md")) continue;
		const raw = readFileSync(new URL(`./src/content/${dir}/${file}`, import.meta.url), "utf8");
		const front = raw.split("\n---")[0];
		const stamp = front.match(/^publishedAt: (.+)$/m)?.[1]?.trim();
		if (stamp) lastmodByPath.set(`/${dir}/${file.replace(/\.md$/, "")}`, new Date(stamp));
	}
}

export default defineConfig({
	site: "https://tinnhamnhi.com",
	trailingSlash: "never",
	build: { format: "directory", inlineStylesheets: "always" },
	integrations: [
		sitemap({
			// Trang 404 và các trang phân trang đã đặt noindex nên không đưa vào sitemap.
			filter: (page) => !page.includes("/404") && !page.includes("/posts/trang/"),
			serialize: (item) => {
				const path = new URL(item.url).pathname.replace(/\/$/, "");
				const lastmod = lastmodByPath.get(path);
				return lastmod ? { ...item, lastmod } : item;
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
