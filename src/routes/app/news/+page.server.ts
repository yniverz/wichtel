import { db } from '#lib/server/app.ts';
import { requireUser } from '#lib/server/guards.ts';
import { newsView } from '#lib/server/news-views.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { feed, markNewsSeen } from '#lib/server/services/news.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const edition = await getCurrentEdition(db());
	const now = new Date();
	const posts = edition ? await feed(db(), user, edition.id, now) : [];
	await markNewsSeen(db(), user.id, now);
	return { posts: posts.map((p) => newsView(p, event.locals.locale, now)) };
};
