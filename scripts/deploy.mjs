/**
 * Đẩy thư mục dist/ lên hosting qua FTP (HostGator).
 *
 * Cấu hình bằng biến môi trường, đặt trong file .env ở gốc dự án (file này
 * KHÔNG được commit — xem .gitignore):
 *
 *   FTP_HOST=ftp.tinnhamnhi.com
 *   FTP_USER=...
 *   FTP_PASSWORD=...
 *   FTP_REMOTE_DIR=/public_html     # mặc định
 *   FTP_SECURE=true                 # dùng FTPS, đặt false nếu host không hỗ trợ
 *
 * Chạy:  npm run deploy          (build rồi đẩy phần thay đổi)
 *        npm run deploy -- --full (đẩy lại toàn bộ)
 *        npm run deploy -- --dry  (chỉ in ra sẽ làm gì, không đụng server)
 *
 * Cách hoạt động: giữ một file .deploy-manifest.json trên server ghi hash của
 * những file đã đẩy. Lần sau chỉ đẩy file đổi hash, xoá file đã bị gỡ khỏi
 * dist. Những file khác trong public_html mà script chưa từng đẩy sẽ không bị
 * đụng tới.
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, relative, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "basic-ftp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
const MANIFEST = ".deploy-manifest.json";

const full = process.argv.includes("--full");
const dry = process.argv.includes("--dry");

const { FTP_HOST, FTP_USER, FTP_PASSWORD } = process.env;
const remoteRoot = process.env.FTP_REMOTE_DIR || "/public_html";
const secure = process.env.FTP_SECURE !== "false";

if (!dry && (!FTP_HOST || !FTP_USER || !FTP_PASSWORD)) {
	console.error(
		"Thiếu thông tin FTP. Tạo file .env ở gốc dự án với FTP_HOST, FTP_USER, FTP_PASSWORD.\n" +
			"Xem hướng dẫn ở đầu file scripts/deploy.mjs."
	);
	process.exit(1);
}

/** Liệt kê toàn bộ file trong dist kèm hash nội dung. */
function scan(dir, base = dir) {
	const out = {};
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) Object.assign(out, scan(full, base));
		else {
			const rel = relative(base, full).split("\\").join("/");
			out[rel] = createHash("sha1").update(readFileSync(full)).digest("hex").slice(0, 16);
		}
	}
	return out;
}

/* Apache cần .htaccess; file này chỉ dùng khi deploy FTP nên không nằm trong public/. */
const htaccessSource = join(root, "hosting/htaccess");
if (existsSync(htaccessSource)) {
	copyFileSync(htaccessSource, join(distDir, ".htaccess"));
	console.log("Đã chép hosting/htaccess → dist/.htaccess");
}

const local = scan(distDir);
const totalBytes = Object.keys(local).reduce((n, f) => n + statSync(join(distDir, f)).size, 0);
console.log(`dist: ${Object.keys(local).length} file, ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);

const client = new Client(30_000);
client.ftp.verbose = false;

try {
	if (dry) {
		console.log("--dry: bỏ qua kết nối, chỉ liệt kê nội dung dist.");
		process.exit(0);
	}

	await client.access({ host: FTP_HOST, user: FTP_USER, password: FTP_PASSWORD, secure });
	console.log(`Đã kết nối ${FTP_HOST}${secure ? " (FTPS)" : ""} → ${remoteRoot}`);
	await client.ensureDir(remoteRoot);
	await client.cd(remoteRoot);

	/* Lấy manifest lần đẩy trước, nếu có. */
	let previous = {};
	if (!full) {
		const tmp = join(mkdtempSync(join(tmpdir(), "tnn-deploy-")), MANIFEST);
		try {
			await client.downloadTo(tmp, MANIFEST);
			previous = JSON.parse(readFileSync(tmp, "utf8"));
			console.log(`Manifest cũ: ${Object.keys(previous).length} file`);
		} catch {
			console.log("Chưa có manifest trên server — sẽ đẩy toàn bộ.");
		}
	}

	const changed = Object.keys(local).filter((f) => previous[f] !== local[f]);
	const removed = Object.keys(previous).filter((f) => !(f in local));
	console.log(`Cần đẩy: ${changed.length} file — cần xoá: ${removed.length} file`);

	let done = 0;
	for (const file of changed) {
		const remotePath = posix.join(remoteRoot, file);
		await client.ensureDir(posix.dirname(remotePath));
		await client.cd(remoteRoot);
		await client.uploadFrom(join(distDir, file), file);
		done++;
		if (done % 20 === 0 || done === changed.length) console.log(`  ${done}/${changed.length}`);
	}

	await client.cd(remoteRoot);
	for (const file of removed) {
		try {
			await client.remove(file);
			console.log(`  đã xoá ${file}`);
		} catch (err) {
			console.warn(`  không xoá được ${file}: ${err.message}`);
		}
	}

	const manifestTmp = join(mkdtempSync(join(tmpdir(), "tnn-deploy-")), MANIFEST);
	writeFileSync(manifestTmp, JSON.stringify(local, null, 0));
	await client.uploadFrom(manifestTmp, MANIFEST);

	console.log("Xong. Nhớ kiểm tra lại site trên trình duyệt.");
} catch (err) {
	console.error("Deploy lỗi:", err.message);
	process.exitCode = 1;
} finally {
	client.close();
}
