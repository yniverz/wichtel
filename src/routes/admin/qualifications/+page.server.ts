import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { config, db } from '#lib/server/app.ts';
import { actorOf, attempt, getAdminContext, type AdminContext } from '#lib/server/guards.ts';
import { qualificationSchema } from '#lib/server/schemas.ts';
import {
	createQualification,
	listQualifications,
	pendingRequests,
	recentDecisions,
	reviewQualification,
	updateQualification
} from '#lib/server/services/qualifications.ts';
import { checkbox, optionalText, parseForm, uuid } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

function access(ctx: AdminContext) {
	const a = {
		review: ctx.authz.canSomewhere('qualification.review'),
		documents: ctx.authz.canSomewhere('qualification.documents.view'),
		manage: ctx.authz.isAdmin
	};
	if (!a.review && !a.manage) error(403, 'error.forbidden');
	return a;
}

export const load: PageServerLoad = async (event) => {
	const ctx = await getAdminContext(event);
	const can = access(ctx);
	const [definitions, pending, recent] = await Promise.all([
		listQualifications(db()),
		can.review ? pendingRequests(db()) : Promise.resolve([]),
		can.review ? recentDecisions(db()) : Promise.resolve([])
	]);
	return {
		can,
		definitions,
		pending: pending.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
		recent: recent.map((r) => ({ ...r, reviewedAt: r.reviewedAt?.toISOString() ?? null }))
	};
};

export const actions: Actions = {
	review: async (event) => {
		const ctx = await getAdminContext(event);
		if (!access(ctx).review) error(403, 'error.forbidden');
		const parsed = parseForm(
			z.object({ id: uuid, approve: checkbox, reviewNote: optionalText(500) }),
			await event.request.formData()
		);
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			reviewQualification(db(), config.uploadDir, actorOf(event), {
				...parsed.data,
				now: new Date()
			})
		);
		if (!result.ok) return result.failure;
		return { success: 'common.saved' };
	},
	save: async (event) => {
		const ctx = await getAdminContext(event);
		if (!access(ctx).manage) error(403, 'error.forbidden');
		const form = await event.request.formData();
		const id = String(form.get('id') ?? '');
		const parsed = parseForm(qualificationSchema, form);
		if (!parsed.ok)
			return fail(400, { action: id || 'new', errors: parsed.errors, values: parsed.values });
		if (id) await updateQualification(db(), actorOf(event), id, parsed.data);
		else await createQualification(db(), actorOf(event), parsed.data);
		return { action: id || 'new', success: 'common.saved' };
	}
};
