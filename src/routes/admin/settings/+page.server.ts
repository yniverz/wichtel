import { fail } from '@sveltejs/kit';
import { config, db } from '#lib/server/app.ts';
import { actorOf, attempt, getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import { settingsSchema } from '#lib/server/schemas.ts';
import { deleteAsset, storeImage } from '#lib/server/services/assets.ts';
import {
	getSettings,
	publicSettings,
	updateSettings,
	type SettingsUpdate
} from '#lib/server/services/settings.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireAdmin(await getAdminContext(event));
	return { current: publicSettings(await getSettings(db())) };
};

const IMAGE_FIELDS = [
	['logo', 'logoAssetId'],
	['background', 'backgroundAssetId'],
	['favicon', 'faviconAssetId']
] as const;

export const actions: Actions = {
	default: async (event) => {
		const ctx = await getAdminContext(event);
		requireAdmin(ctx);
		const form = await event.request.formData();
		const parsed = parseForm(settingsSchema, form);
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });

		const current = await getSettings(db());
		const update: SettingsUpdate = { ...parsed.data };
		const replaced: string[] = [];

		for (const [field, column] of IMAGE_FIELDS) {
			const file = form.get(field);
			const old = current[column];
			if (file instanceof File && file.size > 0) {
				const stored = await attempt(() => storeImage(db(), config.uploadDir, file, ctx.user.id), {
					values: parsed.values
				});
				if (!stored.ok) return stored.failure;
				update[column] = stored.value;
				if (old) replaced.push(old);
			} else if (form.get(`remove_${field}`) === 'on' && old) {
				update[column] = null;
				replaced.push(old);
			}
		}

		await updateSettings(db(), actorOf(event), update);
		for (const id of replaced) await deleteAsset(db(), config.uploadDir, id);
		return { success: 'common.saved' };
	}
};
