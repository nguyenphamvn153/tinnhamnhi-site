/**
 * Sinh toàn bộ ảnh thương hiệu từ brand/mascot.png (linh vật shiba, đã cắt sẵn
 * từ file logo gốc, bỏ phần chữ và ghi chú "Lỗi font").
 *
 *   node scripts/make-brand-assets.mjs
 *
 * Kết quả trong public/:
 *   logo-96.webp        — dùng ở header (hiển thị 40px, dư độ nét cho màn retina)
 *   logo-mascot.png     — bản lớn để dùng lại chỗ khác
 *   favicon-32.png      — favicon
 *   apple-touch-icon.png— icon khi lưu ra màn hình chính iOS
 *   og-default.png      — ảnh chia sẻ mặc định (1200×630)
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "brand/mascot.png");
const publicDir = join(root, "public");
const out = (name) => join(publicDir, name);

const ACCENT = "#d92d20";
const INK = "#16181d";

const log = (name, buf) => console.log(`${name}: ${(buf.length / 1024).toFixed(1)} KB`);

/* --- Logo dùng trong header ------------------------------------------- */
const logo96 = await sharp(source).resize(96, 96, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 90 }).toBuffer();
writeFileSync(out("logo-96.webp"), logo96);
log("logo-96.webp", logo96);

const logo256 = await sharp(source).resize(256, 256).png({ compressionLevel: 9 }).toBuffer();
writeFileSync(out("logo-mascot.png"), logo256);
log("logo-mascot.png", logo256);

/* --- Favicon ----------------------------------------------------------- */
for (const [name, size] of [["favicon-32.png", 32], ["apple-touch-icon.png", 180]]) {
	// Nền trắng cho favicon: linh vật có nhiều nét đen, để trong suốt sẽ chìm trên tab tối.
	const buf = await sharp(source)
		.resize(size, size)
		.flatten({ background: "#ffffff" })
		.png({ compressionLevel: 9 })
		.toBuffer();
	writeFileSync(out(name), buf);
	log(name, buf);
}

/* --- Ảnh chia sẻ mặc định ---------------------------------------------- */
const mascotOg = await sharp(source).resize(420, 420).png().toBuffer();
const ogBackdrop = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${INK}"/>
  <rect x="0" y="0" width="1200" height="12" fill="${ACCENT}"/>
  <text x="80" y="290" font-family="Helvetica,Arial,sans-serif" font-size="88" font-weight="bold" fill="#ffffff">Tin Nhảm Nhí</text>
  <text x="80" y="360" font-family="Helvetica,Arial,sans-serif" font-size="38" fill="#b6bac1">Toàn tin nhảm nhí</text>
  <rect x="80" y="410" width="120" height="8" fill="${ACCENT}"/>
</svg>`);
const og = await sharp(ogBackdrop)
	.composite([{ input: mascotOg, top: 105, left: 700 }])
	.png({ compressionLevel: 9 })
	.toBuffer();
writeFileSync(out("og-default.png"), og);
log("og-default.png", og);
