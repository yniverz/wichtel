import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { actorOf, getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import { MAIL_TEMPLATES, templateText } from '#lib/server/notifications.ts';
import {
	listTemplateOverrides,
	resetTemplate,
	saveTemplate
} from '#lib/server/services/broadcast.ts';
import { LOCALES } from '#lib/i18n/index.ts';
import { parseForm, requiredText } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(await getAdminContext(event));
	const overrides = await listTemplateOverrides(db());
	const templates = [];
	for (const key of MAIL_TEMPLATES) {
		const versions = [];
		for (const locale of LOCALES) {
			const text = await templateText(db(), key, locale);
			versions.push({
				locale,
				...text,
				customised: overrides.some((o) => o.key === key && o.locale === locale)
			});
		}
		templates.push({ key, versions });
	}
	return { templates };
};

const keySchema = { key: z.enum(MAIL_TEMPLATES), locale: z.enum(LOCALES) };

export const actions: Actions = {
	save: async (event) => {
		requireAdmin(await getAdminContext(event));
		const parsed = parseForm(
			z.object({ ...keySchema, subject: requiredText(300), body: requiredText(10_000) }),
			await event.request.formData()
		);
		if (!parsed.ok)
			return fail(400, {
				errors: parsed.errors,
				at: `${parsed.values.key}:${parsed.values.locale}`
			});
		await saveTemplate(db(), actorOf(event), parsed.data);
		return { success: 'common.saved', at: `${parsed.data.key}:${parsed.data.locale}` };
	},
	reset: async (event) => {
		requireAdmin(await getAdminContext(event));
		const parsed = parseForm(z.object(keySchema), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		await resetTemplate(db(), actorOf(event), parsed.data.key, parsed.data.locale);
		return { success: 'common.saved', at: `${parsed.data.key}:${parsed.data.locale}` };
	}
};
