import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { isIsoDate, isWallTime, utcToZoned, zonedToUtc } from '#lib/domain/time.ts';
import { config, db } from '#lib/server/app.ts';
import {
	actorOf,
	attempt,
	getAdminContext,
	requireEdition,
	type AdminContext
} from '#lib/server/guards.ts';
import { waveSchema } from '#lib/server/schemas.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { createWave, deleteWave, listWaves, updateWave } from '#lib/server/services/waves.ts';
import { parseForm, uuid } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

function requireWaveManager(ctx: AdminContext) {
	if (!ctx.authz.can('shift.manage')) error(403, 'error.forbidden');
}

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	requireWaveManager(ctx);
	const { edition, tree } = requireEdition(ctx);
	const tz = (await getSettings(db())).timezone;
	const now = Date.now();
	return {
		areas: tree
			.flat()
			.map(({ area, depth }) => ({ id: area.id, nameDe: area.nameDe, nameEn: area.nameEn, depth })),
		waves: (await listWaves(db(), edition.id)).map((w) => {
			const opens = utcToZoned(w.opensAt, tz);
			const closes = w.closesAt ? utcToZoned(w.closesAt, tz) : null;
			return {
				id: w.id,
				name: w.name,
				opensDate: opens.date,
				opensTime: opens.time,
				closesDate: closes?.date ?? '',
				closesTime: closes?.time ?? '',
				opensAt: w.opensAt.toISOString(),
				areaIds: w.areaIds,
				audience: w.audience,
				inviteUrl: `${config.publicUrl}/invite/${w.inviteCode}`,
				status:
					w.opensAt.getTime() > now
						? 'upcoming'
						: w.closesAt && w.closesAt.getTime() <= now
							? 'closed'
							: 'open'
			};
		}),
		timezone: tz
	};
};

async function inputFrom(form: FormData) {
	const parsed = parseForm(waveSchema, form);
	if (!parsed.ok) return { ok: false as const, errors: parsed.errors };
	const tz = (await getSettings(db())).timezone;
	const d = parsed.data;
	const hasClose = d.closesDate !== '';
	if (hasClose && (!isIsoDate(d.closesDate) || !isWallTime(d.closesTime || '00:00'))) {
		return { ok: false as const, errors: { closesDate: 'error.invalidDate' as const } };
	}
	return {
		ok: true as const,
		input: {
			name: d.name,
			opensAt: zonedToUtc(d.opensDate, d.opensTime, tz),
			closesAt: hasClose ? zonedToUtc(d.closesDate, d.closesTime || '00:00', tz) : null,
			areaIds: d['areaIds[]'],
			audience: d.audience
		}
	};
}

export const actions: Actions = {
	save: async (event) => {
		const ctx = await getAdminContext(event);
		requireWaveManager(ctx);
		const { edition } = requireEdition(ctx);
		const form = await event.request.formData();
		const id = String(form.get('id') ?? '');
		const result = await inputFrom(form);
		if (!result.ok) return fail(400, { action: id || 'new', errors: result.errors });
		const saved = await attempt(
			() =>
				id
					? updateWave(db(), actorOf(event), edition.id, id, result.input)
					: createWave(db(), actorOf(event), edition.id, result.input).then(() => undefined),
			{ action: id || 'new' }
		);
		if (!saved.ok) return saved.failure;
		return { action: id || 'new', success: 'common.saved' };
	},
	delete: async (event) => {
		const ctx = await getAdminContext(event);
		requireWaveManager(ctx);
		const { edition } = requireEdition(ctx);
		const parsed = parseForm(z.object({ id: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			deleteWave(db(), actorOf(event), edition.id, parsed.data.id)
		);
		if (!result.ok) return result.failure;
		return { success: 'common.saved' };
	}
};
