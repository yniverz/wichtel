import { error } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { requireUser } from '#lib/server/guards.ts';
import { newsView } from '#lib/server/news-views.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { readable } from '#lib/server/services/news.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const edition = await getCurrentEdition(db());
	const post = edition ? await readable(db(), user, edition.id, event.params.id) : undefined;
	if (!post) error(404, 'error.notFound');
	return { post: newsView(post, event.locals.locale, new Date(), true) };
};
