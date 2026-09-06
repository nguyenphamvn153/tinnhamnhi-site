/**
 * Sinh biến thể ảnh responsive cho mọi ảnh trong public/uploads.
 *
 * Chạy tự động trước `astro build`. Kết quả:
 *   - public/uploads/<path>/<name>-<w>w.webp cho từng khổ nhỏ hơn ảnh gốc
 *   - src/data/media-manifest.json  { "/uploads/a.webp": { width, height, variants: [{ w, src }] } }
 *
 * Ảnh gốc được commit vào git; biến thể thì không (xem .gitignore).
 */
import { readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, extname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const uploadsDir = join(root, "public/uploads");
const manifestPath = join(root, "src/data/media-manifest.json");

const WIDTHS = [400, 800, 1200];
const SOURCE_EXT = new Set([".webp", ".jpg", ".jpeg", ".png"]);
const VARIANT_RE = /-\d+w\.webp$/;

function walk(dir) {
	const out = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(full));
		else if (SOURCE_EXT.has(extname(entry.name).toLowerCase()) && !VARIANT_RE.test(entry.name)) out.push(full);
	}
	return out;
}

if (!existsSync(uploadsDir)) {
	console.log("optimize-media: chưa có public/uploads, bỏ qua");
	mkdirSync(dirname(manifestPath), { recursive: true });
	writeFileSync(manifestPath, "{}\n");
	process.exit(0);
}

const manifest = {};
let generated = 0;
let reused = 0;

for (const file of walk(uploadsDir)) {
	const publicPath = "/" + relative(join(root, "public"), file).split("\\").join("/");
	let meta;
	try {
		meta = await sharp(file).metadata();
	} catch (err) {
		console.warn(`optimize-media: bỏ qua ${publicPath} (${err.message})`);
		continue;
	}
	if (!meta.width || !meta.height) continue;

	const entry = { width: meta.width, height: meta.height, variants: [] };
	const srcMtime = statSync(file).mtimeMs;
	const ext = extname(file);
	const stem = basename(file, ext);

	for (const w of WIDTHS) {
		if (w >= meta.width) continue;
		const outFile = join(dirname(file), `${stem}-${w}w.webp`);
		const outPath = "/" + relative(join(root, "public"), outFile).split("\\").join("/");
		if (existsSync(outFile) && statSync(outFile).mtimeMs >= srcMtime) {
			reused++;
		} else {
			await sharp(file).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(outFile);
			generated++;
		}
		entry.variants.push({ w, src: outPath });
	}
	entry.variants.push({ w: meta.width, src: publicPath });
	manifest[publicPath] = entry;
}

mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, JSON.stringify(manifest, null, "\t") + "\n");
console.log(
	`optimize-media: ${Object.keys(manifest).length} ảnh — ${generated} biến thể mới, ${reused} dùng lại`
);
