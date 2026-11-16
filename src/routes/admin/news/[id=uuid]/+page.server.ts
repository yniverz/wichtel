import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '#lib/server/app.ts';
import { news } from '#lib/server/db/schema.ts';
import { actorOf, attempt, getAdminContext, requireEdition } from '#lib/server/guards.ts';
import {
	audienceOptions,
	newsInput,
	newsSchema,
	newsValues,
	requireNewsWriter
} from '#lib/server/news-forms.ts';
import { deleteNews, mayManage, updateNews } from '#lib/server/services/news.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function editable(event: RequestEvent) {
	const ctx = await getAdminContext(event);
	requireNewsWriter(ctx);
	const { edition } = requireEdition(ctx);
	const [post] = await db()
		.select()
		.from(news)
		.where(and(eq(news.id, event.params.id), eq(news.editionId, edition.id)));
	if (!post || !(await mayManage(db(), ctx.authz, post))) error(404, 'error.notFound');
	return { ctx, edition, post };
}

export const load: PageServerLoad = async (event) => {
	const { ctx, post } = await editable(event);
	const timezone = (await getSettings(db())).timezone;
	return {
		post: { id: post.id, mailed: post.mailed, publishedAt: post.publishedAt.toISOString() },
		options: await audienceOptions(db(), ctx, post.shiftId),
		values: newsValues(post, timezone)
	};
};

export const actions: Actions = {
	update: async (event) => {
		const { ctx, edition, post } = await editable(event);
		const parsed = parseForm(newsSchema, await event.request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });
		const input = newsInput(parsed.data, (await getSettings(db())).timezone);
		const result = await attempt(
			() => updateNews(db(), actorOf(event), ctx.authz, edition.id, post.id, input),
			{ values: parsed.values }
		);
		if (!result.ok) return result.failure;
		return { success: 'common.saved' };
	},
	delete: async (event) => {
		const { ctx, edition, post } = await editable(event);
		const result = await attempt(() =>
			deleteNews(db(), actorOf(event), ctx.authz, edition.id, post.id)
		);
		if (!result.ok) return result.failure;
		redirect(303, '/admin/news');
	}
};
