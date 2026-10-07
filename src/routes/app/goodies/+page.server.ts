import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { actorOf, attempt, requireVerifiedUser } from '#lib/server/guards.ts';
import { personalQrUrl, qrSvg } from '#lib/server/qr.ts';
import { loadAreaTree } from '#lib/server/services/areas.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import {
	cancelClaim,
	claimGoodie,
	goodieOverview,
	requestRefund
} from '#lib/server/services/goodies.ts';
import { pointsHistory } from '#lib/server/services/points.ts';
import { parseForm, uuid } from '#lib/server/validation.ts';
import { fieldView } from '#lib/server/field-views.ts';
import {
	fieldsFor,
	listFields,
	readFieldInput,
	saveValues,
	validateFields,
	valuesOf
} from '#lib/server/services/fields.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireVerifiedUser(event);
	const database = db();
	const qr = await qrSvg(personalQrUrl(user.qrToken));
	const edition = await getCurrentEdition(database);
	if (!edition) {
		return {
			qr,
			overview: null,
			history: [],
			areaNames: {} as Record<string, { nameDe: string; nameEn: string }>
		};
	}
	const [overview, history, tree, allFields, fieldValues] = await Promise.all([
		goodieOverview(database, user.id, edition.id),
		pointsHistory(database, user.id, edition.id),
		loadAreaTree(database, edition.id),
		listFields(database),
		valuesOf(database, user.id)
	]);
	const areaNames: Record<string, { nameDe: string; nameEn: string }> = {};
	for (const { area } of tree.flat())
		areaNames[area.id] = { nameDe: area.nameDe, nameEn: area.nameEn };
	return {
		qr,
		areaNames,
		fieldValues,
		history: history.map((h) => ({
			...h,
			createdAt: h.createdAt.toISOString(),
			shiftStartsAt: h.shiftStartsAt?.toISOString() ?? null
		})),
		overview: {
			balance: overview.balance,
			pending: overview.pending,
			reserved: overview.reserved,
			claims: overview.claims.map(({ claim, goodie }) => ({
				id: claim.id,
				status: claim.status,
				variant: claim.variant,
				issuedAt: claim.issuedAt?.toISOString() ?? null,
				goodie: {
					nameDe: goodie.nameDe,
					nameEn: goodie.nameEn,
					mandatory: goodie.mandatory,
					refundable: goodie.refundable
				}
			})),
			goodies: overview.goodies
				.filter((g) => g.active)
				.map((g) => ({
					id: g.id,
					nameDe: g.nameDe,
					nameEn: g.nameEn,
					descriptionDe: g.descriptionDe,
					descriptionEn: g.descriptionEn,
					price: g.price,
					variants: g.variants,
					mandatory: g.mandatory,
					advance: g.advance,
					requiredAreaIds: g.requiredAreaIds,
					remaining: g.remaining,
					availability: g.availability,
					fields: fieldsFor(allFields, { goodieId: g.id }).map(fieldView)
				}))
		}
	};
};

export const actions: Actions = {
	claim: async (event) => {
		const user = requireVerifiedUser(event);
		const form = await event.request.formData();
		const parsed = parseForm(z.object({ goodieId: uuid, variant: z.string().optional() }), form);
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const fields = fieldsFor(await listFields(db()), { goodieId: parsed.data.goodieId });
		const checked = validateFields(fields, readFieldInput(form, fields));
		if (!checked.ok) return fail(400, { goodieId: parsed.data.goodieId, errors: checked.errors });
		await saveValues(db(), user.id, checked.values);
		const result = await attempt(() =>
			claimGoodie(db(), actorOf(event), user.id, parsed.data.goodieId, parsed.data.variant || null)
		);
		if (!result.ok) return result.failure;
		return { success: 'goodies.picked' };
	},
	cancel: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(z.object({ claimId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			cancelClaim(db(), actorOf(event), parsed.data.claimId, user.id)
		);
		if (!result.ok) return result.failure;
		return { success: 'common.saved' };
	},
	refund: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(z.object({ claimId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() => requestRefund(db(), user.id, parsed.data.claimId));
		if (!result.ok) return result.failure;
		return { success: 'common.saved' };
	}
};
