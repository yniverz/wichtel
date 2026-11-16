import { error, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { newsView } from '#lib/server/news-views.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { readable } from '#lib/server/services/news.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (locals.user) redirect(303, `/app/news/${params.id}`);
	const edition = await getCurrentEdition(db());
	const post = edition ? await readable(db(), null, edition.id, params.id) : undefined;
	if (!post) error(404, 'error.notFound');
	return { post: newsView(post, locals.locale, new Date(), true) };
};
