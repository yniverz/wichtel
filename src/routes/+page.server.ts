import { db } from '#lib/server/app.ts';
import { newsView } from '#lib/server/news-views.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { feed } from '#lib/server/services/news.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const edition = await getCurrentEdition(db());
	const now = new Date();
	// Public posts only, also for signed-in visitors (the start page is the same for everyone).
	const posts = edition ? await feed(db(), null, edition.id, now) : [];
	return {
		edition: edition ? { startsOn: edition.startsOn, endsOn: edition.endsOn } : null,
		news: posts.slice(0, 3).map((p) => newsView(p, locals.locale, now))
	};
};
