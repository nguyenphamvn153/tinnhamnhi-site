/** Cấu hình site — thay cho site settings cũ lưu trong database EmDash. */
export const site = {
	title: "Tin Nhảm Nhí",
	tagline: "Toàn tin nhảm nhí",
	description:
		"Tin Nhảm Nhí — chuyện sức khỏe, grooming, lối sống và những thứ nhảm nhí tử tế dành cho đàn ông.",
	url: "https://tinnhamnhi.com",
	locale: "vi-VN",
	lang: "vi",
} as const;

export interface Category {
	slug: string;
	label: string;
	description: string;
}

/** Thứ tự ở đây là thứ tự hiển thị trên menu. */
export const categories: Category[] = [
	{ slug: "suc-khoe", label: "Sức khỏe", description: "Cơ thể, thể lực, giấc ngủ và những thói quen nên bỏ. Kiến thức sức khoẻ dành cho nam giới, viết dễ hiểu và không doạ người đọc." },
	{ slug: "grooming", label: "Grooming", description: "Chăm sóc da, cạo râu, khử mùi, nước hoa và vệ sinh cá nhân — những việc nhỏ hằng ngày quyết định phần lớn ấn tượng của một người đàn ông." },
	{ slug: "loi-song", label: "Lối sống", description: "Thói quen, thời trang, tiền bạc, chiêm tinh và những chuyện đời thường mà đàn ông hay gặp nhưng ít khi ngồi xuống đọc kỹ." },
	{ slug: "chuyen-la", label: "Chuyện lạ", description: "Lịch sử, khoa học, địa lý và những sự thật khó tin nhưng có thật. Đọc xong là có chuyện để kể lại cho người khác nghe." },
	{ slug: "giai-tri", label: "Giải trí", description: "Phim ảnh, internet, đồ chơi công nghệ và đủ thứ nhảm nhí khác. Phần nhẹ đầu nhất của Tin Nhảm Nhí." },
];

export const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

export const nav = [
	{ label: "Trang chủ", href: "/" },
	...categories.map((c) => ({ label: c.label, href: `/category/${c.slug}` })),
	{ label: "Tất cả bài", href: "/posts" },
];

/**
 * Chuyên mục có nội dung sức khoẻ: bài trong các mục này tự động kèm lời
 * miễn trừ y khoa ở cuối. Thêm "grooming" vào đây nếu muốn áp cả mục đó.
 */
export const authorName = "Anh Nhảm";

export const healthDisclaimerCategories = ["suc-khoe"];

export const POSTS_PER_PAGE = 12;
