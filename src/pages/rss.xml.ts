import type { APIRoute } from "astro";
import { site } from "../site.config";
import { getPublishedPosts } from "../utils/posts";

const escapeXml = (str: string) =>
	str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");

export const GET: APIRoute = async () => {
	const posts = (await getPublishedPosts()).slice(0, 20);

	const items = posts
		.map((post) => {
			const url = `${site.url}/posts/${post.id}`;
			const pubDate = post.data.publishedAt?.toUTCString();
			return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>${pubDate ? `\n      <pubDate>${pubDate}</pubDate>` : ""}
      <description>${escapeXml(post.data.excerpt ?? "")}</description>
    </item>`;
		})
		.join("\n");

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <description>${escapeXml(site.tagline)}</description>
    <link>${site.url}/</link>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>vi</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

	return new Response(rss, {
		headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
	});
};
