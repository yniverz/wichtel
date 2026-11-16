import { fail, redirect } from '@sveltejs/kit';
import { renderMarkdown } from '#lib/domain/markdown.ts';
import { db } from '#lib/server/app.ts';
import { actorOf, attempt, getAdminContext, requireEdition } from '#lib/server/guards.ts';
import {
	audienceOptions,
	newsInput,
	newsSchema,
	requireNewsWriter
} from '#lib/server/news-forms.ts';
import { publishNews, recipients } from '#lib/server/services/news.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	requireNewsWriter(ctx);
	requireEdition(ctx);
	const options = await audienceOptions(db(), ctx, event.url.searchParams.get('shift'));
	return {
		options,
		values: { audience: options.audiences[0] }
	};
};

async function parse(event: RequestEvent) {
	const ctx = await getAdminContext(event);
	requireNewsWriter(ctx);
	const { edition } = requireEdition(ctx);
	const parsed = parseForm(newsSchema, await event.request.formData());
	if (!parsed.ok) return { ctx, edition, parsed };
	// An unticked checkbox is missing from the form; keep it unticked when the form comes back.
	const values = { ...parsed.values, sendMail: parsed.data.sendMail ? 'on' : '' };
	const input = newsInput(parsed.data, (await getSettings(db())).timezone);
	return { ctx, edition, parsed, values, input };
}

export const actions: Actions = {
	/** Shows the post as helpers will see it and how many people it reaches. */
	preview: async (event) => {
		const { edition, parsed, values, input } = await parse(event);
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });
		const people = await attempt(() => recipients(db(), edition.id, input!), { values });
		if (!people.ok) return people.failure;
		return {
			preview: {
				reach: people.value.length,
				html: renderMarkdown(input!.bodyDe),
				title: input!.titleDe
			},
			values
		};
	},
	publish: async (event) => {
		const { ctx, edition, parsed, values, input } = await parse(event);
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });
		const result = await attempt(
			() => publishNews(db(), actorOf(event), ctx.authz, edition.id, input!, parsed.data.sendMail),
			{ values }
		);
		if (!result.ok) return result.failure;
		redirect(303, `/admin/news?published=${result.value.mailed ?? ''}`);
	}
};
