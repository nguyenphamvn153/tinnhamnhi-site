import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"posts">;

/** Bài đã publish, mới nhất trước. Draft không bao giờ được build. */
export async function getPublishedPosts(): Promise<Post[]> {
	const posts = await getCollection("posts", ({ data }) => !data.draft);
	return posts.sort(
		(a, b) => (b.data.publishedAt?.getTime() ?? 0) - (a.data.publishedAt?.getTime() ?? 0)
	);
}

export function tagSlug(tag: string): string {
	return tag
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[đĐ]/g, "d")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export async function getAllTags(): Promise<{ slug: string; label: string; count: number }[]> {
	const posts = await getPublishedPosts();
	const map = new Map<string, { slug: string; label: string; count: number }>();
	for (const post of posts) {
		for (const tag of post.data.tags) {
			const slug = tagSlug(tag);
			const existing = map.get(slug);
			if (existing) existing.count++;
			else map.set(slug, { slug, label: tag, count: 1 });
		}
	}
	return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));
}

const READING_SPEED_WPM = 200;

export function readingTime(body: string | undefined): number {
	if (!body) return 1;
	const words = body.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length;
	return Math.max(1, Math.round(words / READING_SPEED_WPM));
}

export function formatDate(date: Date | undefined): string | null {
	if (!date) return null;
	return new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
