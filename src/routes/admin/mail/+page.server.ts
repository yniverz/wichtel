import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import {
	actorOf,
	attempt,
	getAdminContext,
	requireEdition,
	type AdminContext
} from '#lib/server/guards.ts';
import { recipients, sendBroadcast, type Audience } from '#lib/server/services/broadcast.ts';
import { getShift } from '#lib/server/services/shifts.ts';
import { optionalText, parseForm, requiredText } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

function allowedKinds(ctx: AdminContext) {
	const { authz } = ctx;
	if (!authz.canSomewhere('mail.send')) error(403, 'error.forbidden');
	return {
		area: true,
		shift: true,
		helpers: authz.can('mail.send'),
		crew: authz.can('mail.send'),
		everyone: authz.isAdmin
	};
}

const schema = z.object({
	kind: z.enum(['area', 'shift', 'helpers', 'crew', 'everyone']),
	areaId: z.string().default(''),
	shiftId: z.string().default(''),
	subjectDe: requiredText(200),
	bodyDe: requiredText(10_000),
	subjectEn: optionalText(200),
	bodyEn: optionalText(10_000)
});

/** Parses the form and checks that the sender may write to the chosen audience. */
async function audienceFrom(ctx: AdminContext, form: FormData) {
	const parsed = parseForm(schema, form);
	if (!parsed.ok) return { ok: false as const, errors: parsed.errors, values: parsed.values };
	const d = parsed.data;
	const kinds = allowedKinds(ctx);
	if (!kinds[d.kind]) error(403, 'error.forbidden');
	let audience: Audience;
	if (d.kind === 'area') {
		if (!ctx.authz.can('mail.send', d.areaId)) error(403, 'error.forbidden');
		audience = { kind: 'area', areaId: d.areaId };
	} else if (d.kind === 'shift') {
		const shift = await getShift(db(), d.shiftId);
		if (!shift || !ctx.authz.can('mail.send', shift.areaId)) error(403, 'error.forbidden');
		audience = { kind: 'shift', shiftId: shift.id };
	} else {
		audience = { kind: d.kind };
	}
	return { ok: true as const, data: d, audience, values: parsed.values };
}

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const kinds = allowedKinds(ctx);
	const { tree } = requireEdition(ctx);
	const shiftId = event.url.searchParams.get('shift');
	const shift = shiftId ? await getShift(db(), shiftId) : null;
	return {
		kinds,
		areas: tree
			.flat()
			.filter(({ area }) => ctx.authz.can('mail.send', area.id))
			.map(({ area, depth }) => ({ id: area.id, nameDe: area.nameDe, nameEn: area.nameEn, depth })),
		shift:
			shift && ctx.authz.can('mail.send', shift.areaId)
				? { id: shift.id, titleDe: shift.titleDe, titleEn: shift.titleEn }
				: null
	};
};

export const actions: Actions = {
	preview: async (event) => {
		const ctx = await getAdminContext(event);
		const { edition } = requireEdition(ctx);
		const result = await audienceFrom(ctx, await event.request.formData());
		if (!result.ok) return fail(400, { errors: result.errors, values: result.values });
		const people = await attempt(() => recipients(db(), edition.id, result.audience), {
			values: result.values
		});
		if (!people.ok) return people.failure;
		return { preview: people.value.length, values: result.values };
	},
	send: async (event) => {
		const ctx = await getAdminContext(event);
		const { edition } = requireEdition(ctx);
		const result = await audienceFrom(ctx, await event.request.formData());
		if (!result.ok) return fail(400, { errors: result.errors, values: result.values });
		const sent = await attempt(
			() =>
				sendBroadcast(db(), actorOf(event), {
					editionId: edition.id,
					audience: result.audience,
					subjectDe: result.data.subjectDe,
					bodyDe: result.data.bodyDe,
					subjectEn: result.data.subjectEn,
					bodyEn: result.data.bodyEn
				}),
			{ values: result.values }
		);
		if (!sent.ok) return sent.failure;
		return { sent: sent.value };
	}
};
