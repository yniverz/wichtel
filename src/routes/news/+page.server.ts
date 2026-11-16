import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { newsView } from '#lib/server/news-views.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { feed } from '#lib/server/services/news.ts';
import type { PageServerLoad } from './$types';

/** Public posts for everyone; signed-in people get their full news feed instead. */
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/app/news');
	const edition = await getCurrentEdition(db());
	const now = new Date();
	const posts = edition ? await feed(db(), null, edition.id, now) : [];
	return { posts: posts.map((p) => newsView(p, locals.locale, now)) };
};
