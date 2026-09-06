/**
 * One-off migration: EmDash (Cloudflare D1, Portable Text) -> Markdown content collections.
 *
 * Usage:
 *   node scripts/import-from-emdash.mjs <export-dir> [--write]
 *
 * <export-dir> holds posts.json / pages.json / media.json dumped from D1 with
 * `wrangler d1 execute tinnhamnhi-site --remote --json --command "SELECT ..."`.
 * Writes src/content/{posts,pages}/*.md and prints the media paths that must be
 * downloaded into public/.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const exportDir = process.argv[2];
const write = process.argv.includes("--write");
/** Second pass: media keys that turned out not to exist in R2 (already 404 on the old site) get dropped. */
const skipArg = process.argv.find((a) => a.startsWith("--skip-missing="));
const skipMissing = new Set(
	skipArg ? readFileSync(skipArg.slice("--skip-missing=".length), "utf8").trim().split("\n").filter(Boolean) : []
);
let dropped = 0;
if (!exportDir) {
	console.error("usage: node scripts/import-from-emdash.mjs <export-dir> [--write]");
	process.exit(1);
}

const read = (name) => JSON.parse(readFileSync(join(exportDir, name), "utf8"));
const mediaAssets = new Set();

/** EmDash serves media at /_emdash/api/media/file/<storage_key>; static site serves it at /<storage_key>. */
function localMediaPath(url) {
	if (!url) return null;
	const m = String(url).match(/\/_emdash\/api\/media\/file\/(.+)$/);
	if (m && skipMissing.has(m[1])) {
		dropped++;
		return null;
	}
	const path = m ? `/${m[1]}` : String(url);
	if (m) mediaAssets.add(m[1]);
	return path;
}

const escapeText = (t) =>
	t
		.replace(/\\/g, "\\\\")
		.replace(/([*_`[\]])/g, "\\$1")
		.replace(/^(\s*)([#>+-]|\d+\.)(\s)/gm, "$1\\$2$3");

const escapeAttr = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function renderSpans(block) {
	const defs = Object.fromEntries((block.markDefs ?? []).map((d) => [d._key, d]));
	return (block.children ?? [])
		.map((span) => {
			if (span._type !== "span") return "";
			let text = escapeText(span.text ?? "");
			if (!text) return "";
			let href = null;
			for (const mark of span.marks ?? []) {
				if (mark === "strong") text = `**${text}**`;
				else if (mark === "em") text = `*${text}*`;
				else if (mark === "code") text = `\`${span.text}\``;
				else if (mark === "underline") text = `<u>${text}</u>`;
				else if (mark === "superscript") text = `<sup>${text}</sup>`;
				else if (mark === "subscript") text = `<sub>${text}</sub>`;
				else if (defs[mark]?._type === "link") href = defs[mark].href;
			}
			return href ? `[${text}](${href})` : text;
		})
		.join("");
}

function renderImage(img, { block = true } = {}) {
	const src = localMediaPath(img.asset?.url ?? img.src);
	if (!src) return "";
	const alt = escapeAttr(img.alt ?? "");
	const dims = [
		img.width ? ` width="${img.width}"` : "",
		img.height ? ` height="${img.height}"` : "",
	].join("");
	const tag = `<img src="${src}" alt="${alt}"${dims} loading="lazy" decoding="async" />`;
	if (!block) return tag;
	if (img.caption) {
		return `<figure>\n  ${tag}\n  <figcaption>${escapeAttr(img.caption)}</figcaption>\n</figure>`;
	}
	return tag;
}

function renderBlock(block) {
	switch (block._type) {
		case "block": {
			const text = renderSpans(block);
			if (!text.trim()) return "";
			if (block.listItem) {
				const indent = "  ".repeat(Math.max(0, (block.level ?? 1) - 1));
				return `${indent}${block.listItem === "number" ? "1." : "-"} ${text}`;
			}
			switch (block.style) {
				case "h1": return `# ${text}`;
				case "h2": return `## ${text}`;
				case "h3": return `### ${text}`;
				case "h4": return `#### ${text}`;
				case "h5": return `##### ${text}`;
				case "h6": return `###### ${text}`;
				case "blockquote": return text.split("\n").map((l) => `> ${l}`).join("\n");
				default: return text;
			}
		}
		case "image":
			return renderImage(block);
		case "gallery": {
			const imgs = (block.images ?? []).map((i) => `  ${renderImage(i, { block: false })}`).join("\n");
			return `<div class="content-gallery">\n${imgs}\n</div>`;
		}
		case "columns": {
			const cols = (block.columns ?? [])
				.map((col) => {
					const inner = (col.content ?? []).map((b) => `    ${renderBlock(b)}`).join("\n");
					return `  <div class="content-column">\n${inner}\n  </div>`;
				})
				.join("\n");
			return `<div class="content-columns">\n${cols}\n</div>`;
		}
		case "embed": {
			if (block.provider === "youtube" && block.url) {
				const id = block.url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1];
				if (id) {
					return `<div class="content-embed content-embed--youtube"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" loading="lazy" allowfullscreen frameborder="0"></iframe></div>`;
				}
			}
			if (block.html) return block.html.trim();
			return block.url ? `<p><a href="${block.url}">${block.url}</a></p>` : "";
		}
		case "htmlBlock":
			return (block.html ?? "").trim();
		default:
			console.warn(`  ! unhandled block type: ${block._type}`);
			return "";
	}
}

function toMarkdown(content) {
	const blocks = typeof content === "string" ? JSON.parse(content || "[]") : content ?? [];
	const out = [];
	let prevWasListItem = false;
	for (const block of blocks) {
		const rendered = renderBlock(block);
		if (!rendered) continue;
		const isListItem = block._type === "block" && !!block.listItem;
		// keep consecutive list items in one list, blank-line separate everything else
		if (out.length && !(isListItem && prevWasListItem)) out.push("");
		out.push(rendered);
		prevWasListItem = isListItem;
	}
	return out.join("\n").trim() + "\n";
}

const yamlString = (v) => JSON.stringify(String(v ?? ""));
const isoDate = (v) => (v ? new Date(v.includes("T") ? v : v.replace(" ", "T") + "Z").toISOString() : null);

function safeSlug(slug, fallback) {
	let s = slug ?? "";
	try { s = decodeURIComponent(s); } catch {}
	s = s
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[đĐ]/g, "d")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return s || fallback;
}

function convert(rows, collection) {
	const dir = join(root, "src/content", collection);
	if (write) mkdirSync(dir, { recursive: true });
	const seen = new Set();
	let written = 0;
	for (const row of rows) {
		let slug = safeSlug(row.slug, `untitled-${row.id}`);
		while (seen.has(slug)) slug = `${slug}-2`;
		seen.add(slug);
		if (slug !== row.slug) console.warn(`  ~ slug normalised: ${row.slug} -> ${slug}`);

		const featured = typeof row.featured_image === "string" ? JSON.parse(row.featured_image || "null") : row.featured_image;
		const body = toMarkdown(row.content);

		const fm = [`title: ${yamlString(row.title)}`];
		if (row.excerpt) fm.push(`excerpt: ${yamlString(row.excerpt)}`);
		const featuredSrc = localMediaPath(featured?.src ?? featured?.asset?.url);
		if (featuredSrc) {
			fm.push(`featuredImage: ${yamlString(featuredSrc)}`);
			if (featured?.alt) fm.push(`featuredImageAlt: ${yamlString(featured.alt)}`);
		}
		const published = isoDate(row.published_at);
		if (published) fm.push(`publishedAt: ${published}`);
		const updated = isoDate(row.updated_at);
		if (updated) fm.push(`updatedAt: ${updated}`);
		if (row.status !== "published") fm.push("draft: true");

		const file = `---\n${fm.join("\n")}\n---\n\n${body}`;
		if (write) writeFileSync(join(dir, `${slug}.md`), file, "utf8");
		written++;
	}
	console.log(`${collection}: ${written} file(s) ${write ? "written" : "(dry run)"}`);
}

convert(read("posts.json"), "posts");
convert(read("pages.json"), "pages");

const manifest = [...mediaAssets].sort();
if (write) writeFileSync(join(exportDir, "media-manifest.txt"), manifest.join("\n") + "\n", "utf8");
console.log(`media referenced: ${manifest.length} file(s)`);
if (skipMissing.size) console.log(`dropped ${dropped} reference(s) to missing media`);
