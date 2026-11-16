import { renderMarkdown } from '#lib/domain/markdown.ts';
import { excerpt, isPinned } from '#lib/domain/news.ts';
import { localized, type Locale } from '#lib/i18n/index.ts';
import type { News } from './db/schema.ts';

const MINUTE = 60_000;

/**
 * A post as readers see it, in their language. In lists (`full` false) long posts show only their
 * beginning; short ones are shown whole.
 */
export function newsView(post: News, locale: Locale, now: Date, full = false) {
	const body = localized(post, 'body', locale);
	const start = excerpt(body);
	return {
		id: post.id,
		title: localized(post, 'title', locale),
		publishedAt: post.publishedAt.toISOString(),
		/** Set when the post was changed noticeably later. */
		updatedAt:
			post.updatedAt.getTime() - post.publishedAt.getTime() > 5 * MINUTE
				? post.updatedAt.toISOString()
				: null,
		pinned: isPinned(post, now),
		html: full || !start.more ? renderMarkdown(body) : null,
		excerpt: start.text
	};
}

export type NewsView = ReturnType<typeof newsView>;
