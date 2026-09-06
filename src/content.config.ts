import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "zod";

const posts = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
	schema: z.object({
		title: z.string(),
		/** Tiêu đề ngắn dùng cho thẻ <title> và kết quả tìm kiếm khi tiêu đề bài quá dài. */
		metaTitle: z.string().optional(),
		category: z.string().optional(),
		tags: z.array(z.string()).default([]),
		excerpt: z.string().optional(),
		featuredImage: z.string().optional(),
		featuredImageAlt: z.string().optional(),
		publishedAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional(),
		draft: z.boolean().default(false),
	}),
});

const pages = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
	schema: z.object({
		title: z.string(),
		excerpt: z.string().optional(),
		publishedAt: z.coerce.date().optional(),
		updatedAt: z.coerce.date().optional(),
		draft: z.boolean().default(false),
	}),
});

export const collections = { posts, pages };
