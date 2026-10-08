import { error } from '@sveltejs/kit';
import { renderMarkdown } from '#lib/domain/markdown.ts';
import { db } from '#lib/server/app.ts';
import { hasImprint, imprintMarkdown } from '#lib/server/legal.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const settings = await getSettings(db());
	if (!hasImprint(settings)) error(404, 'error.notFound');
	return { html: renderMarkdown(imprintMarkdown(settings, locals.locale)) };
};
