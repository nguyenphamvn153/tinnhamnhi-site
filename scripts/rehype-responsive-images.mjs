/**
 * Rehype plugin: biến <img src="/uploads/..."> trong nội dung Markdown thành ảnh
 * responsive (srcset + width/height cố định để CLS = 0), dựa trên manifest do
 * scripts/optimize-media.mjs sinh ra.
 *
 * Ảnh trong bài nằm trong HTML thô (<figure>, <div class="content-gallery">…),
 * mà Astro giữ nguyên các khối đó dưới dạng node `raw` — nên plugin xử lý cả
 * node `element` (ảnh viết bằng cú pháp Markdown) lẫn chuỗi HTML thô.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const manifestPath = join(dirname(fileURLToPath(import.meta.url)), "../src/data/media-manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

/** Ảnh trong bài rộng tối đa bằng cột chữ (44rem ≈ 704px), full-width trên mobile. */
const SIZES = "(max-width: 768px) 100vw, 704px";

const srcsetFor = (entry) => entry.variants.map((v) => `${v.src} ${v.w}w`).join(", ");

function visit(node, fn) {
	fn(node);
	for (const child of node.children ?? []) visit(child, fn);
}

/** Thêm thuộc tính vào thẻ <img> trong chuỗi HTML thô, giữ nguyên phần còn lại. */
function rewriteRawHtml(html) {
	return html.replace(/<img\s([^>]*?)\/?>/g, (tag, attrs) => {
		const src = attrs.match(/\ssrc="([^"]+)"/)?.[1] ?? attrs.match(/^src="([^"]+)"/)?.[1];
		const entry = src ? manifest[src] : null;
		if (!entry) return tag;
		let out = attrs.trim();
		if (!/\swidth=/.test(` ${out}`)) out += ` width="${entry.width}"`;
		if (!/\sheight=/.test(` ${out}`)) out += ` height="${entry.height}"`;
		if (entry.variants.length > 1 && !/\ssrcset=/.test(` ${out}`)) {
			out += ` srcset="${srcsetFor(entry)}" sizes="${SIZES}"`;
		}
		return `<img ${out} />`;
	});
}

export function responsiveContentImages() {
	return (tree) => {
		visit(tree, (node) => {
			if (node.type === "raw" && typeof node.value === "string" && node.value.includes("<img")) {
				node.value = rewriteRawHtml(node.value);
				return;
			}
			if (node.type !== "element" || node.tagName !== "img") return;
			const src = node.properties?.src;
			const entry = typeof src === "string" ? manifest[src] : null;
			if (!entry) return;

			node.properties.width ??= entry.width;
			node.properties.height ??= entry.height;
			node.properties.loading ??= "lazy";
			node.properties.decoding ??= "async";
			if (entry.variants.length > 1) {
				node.properties.srcset = srcsetFor(entry);
				node.properties.sizes ??= SIZES;
			}
		});
	};
}
