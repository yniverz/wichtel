import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { actorOf, attempt, getAdminContext, requireEdition } from '#lib/server/guards.ts';
import { hasShiftAccess } from '#lib/server/shift-access.ts';
import { decideRequest, pendingRequests } from '#lib/server/services/assignments.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { decideSwap, pendingSwaps } from '#lib/server/services/swaps.ts';
import { checkbox, parseForm, uuid } from '#lib/server/validation.ts';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const ref = (s: {
	id: string;
	titleDe: string;
	titleEn: string;
	startsAt: Date;
	endsAt: Date;
}) => ({
	id: s.id,
	titleDe: s.titleDe,
	titleEn: s.titleEn,
	startsAt: s.startsAt.toISOString(),
	endsAt: s.endsAt.toISOString()
});

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	if (!hasShiftAccess(ctx)) error(403, 'error.forbidden');
	const { edition } = requireEdition(ctx);
	const [requests, swaps, settings] = await Promise.all([
		pendingRequests(db(), ctx.authz, edition.id),
		pendingSwaps(db(), ctx.authz, edition.id),
		getSettings(db())
	]);
	return {
		timezone: settings.timezone,
		requests: requests.map((r) => ({
			id: r.id,
			name: `${r.firstName} ${r.lastName}`,
			userId: r.userId,
			shift: ref(r.shift),
			positionNameDe: r.positionNameDe,
			positionNameEn: r.positionNameEn
		})),
		swaps: swaps.map((s) => ({
			id: s.id,
			from: `${s.fromName} ${s.fromLastName}`,
			to: `${s.takerName} ${s.takerLastName}`,
			shift: ref(s.shift),
			positionNameDe: s.positionNameDe,
			positionNameEn: s.positionNameEn,
			counter: s.counter ? ref(s.counter) : null
		}))
	};
};

const decision = z.object({ id: uuid, approve: checkbox });

export const actions: Actions = {
	request: async (event) => {
		const ctx = await getAdminContext(event);
		const parsed = parseForm(decision, await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			decideRequest(
				{ db: db(), now: new Date() },
				actorOf(event),
				ctx.authz,
				parsed.data.id,
				parsed.data.approve
			)
		);
		if (!result.ok) return result.failure;
		return { success: 'common.saved' };
	},
	swap: async (event) => {
		const ctx = await getAdminContext(event);
		const parsed = parseForm(decision, await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			decideSwap(
				{ db: db(), now: new Date() },
				actorOf(event),
				ctx.authz,
				parsed.data.id,
				parsed.data.approve
			)
		);
		if (!result.ok) return result.failure;
		return { success: 'common.saved' };
	}
};
