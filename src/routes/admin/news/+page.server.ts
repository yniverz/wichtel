import { db } from '#lib/server/app.ts';
import { getAdminContext, requireEdition } from '#lib/server/guards.ts';
import { requireNewsWriter } from '#lib/server/news-forms.ts';
import { manageableNews } from '#lib/server/services/news.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	requireNewsWriter(ctx);
	const { edition } = requireEdition(ctx);
	const posts = await manageableNews(db(), ctx.authz, edition.id);
	return {
		posts: posts.map((p) => ({
			id: p.id,
			titleDe: p.titleDe,
			titleEn: p.titleEn,
			audience: p.audience,
			pinned: p.pinned,
			pinnedUntil: p.pinnedUntil?.toISOString() ?? null,
			mailed: p.mailed,
			author: p.author,
			publishedAt: p.publishedAt.toISOString()
		}))
	};
};
