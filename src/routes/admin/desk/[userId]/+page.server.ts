import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { checkInOpen } from '#lib/domain/booking.ts';
import { db } from '#lib/server/app.ts';
import { deskAccess, shiftsForCheckIn } from '#lib/server/desk.ts';
import { actorOf, attempt, getAdminContext, requireEdition } from '#lib/server/guards.ts';
import { setAttendance } from '#lib/server/services/assignments.ts';
import {
	cancelClaim,
	goodieOverview,
	issueClaim,
	issueDirectly,
	markRefunded
} from '#lib/server/services/goodies.ts';
import { getPerson } from '#lib/server/services/people.ts';
import { adjustPoints, pointsHistory } from '#lib/server/services/points.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { parseForm, requiredText, uuid } from '#lib/server/validation.ts';
import { displayValue } from '#lib/domain/fields.ts';
import { fieldsFor, listFields, valuesOf } from '#lib/server/services/fields.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

async function context(event: RequestEvent) {
	const ctx = await getAdminContext(event);
	const access = deskAccess(ctx);
	const { edition } = requireEdition(ctx);
	const person = await getPerson(db(), event.params.userId);
	if (!person) error(404, 'error.notFound');
	return { ctx, access, edition, person };
}

export const load: PageServerLoad = async (event) => {
	const { ctx, access, edition, person } = await context(event);
	const database = db();
	const now = new Date();
	const tz = (await getSettings(database)).timezone;
	const [today, overview, history, allFields, values] = await Promise.all([
		shiftsForCheckIn(database, person.id, edition.id, now, tz),
		goodieOverview(database, person.id, edition.id),
		pointsHistory(database, person.id, edition.id),
		listFields(database),
		valuesOf(database, person.id)
	]);
	const detailsFor = (goodieId: string) =>
		fieldsFor(allFields, { goodieId })
			.map((f) => ({
				labelDe: f.labelDe,
				labelEn: f.labelEn,
				value: displayValue(values[f.id], '✓', '–')
			}))
			.filter((d) => d.value !== '');
	return {
		timezone: tz,
		access,
		person: {
			id: person.id,
			name: `${person.firstName} ${person.lastName}`,
			phone: access.contact ? person.phone : null,
			emailVerified: person.emailVerifiedAt !== null
		},
		today: today.map((s) => ({
			...s,
			startsAt: s.startsAt.toISOString(),
			endsAt: s.endsAt.toISOString(),
			canCheckIn: ctx.authz.can('attendance.confirm', s.areaId) && checkInOpen(now, s.startsAt, tz)
		})),
		balance: overview.balance,
		pending: overview.pending,
		claims: overview.claims
			.filter(({ claim }) => claim.status === 'selected' || claim.status === 'refund_pending')
			.map(({ claim, goodie }) => ({
				id: claim.id,
				status: claim.status,
				variant: claim.variant,
				goodie: { nameDe: goodie.nameDe, nameEn: goodie.nameEn },
				details: detailsFor(goodie.id)
			})),
		handOut: overview.goodies
			.filter(
				(g) => g.active && g.availability !== 'notEligible' && g.availability !== 'limitReached'
			)
			.map((g) => ({
				id: g.id,
				nameDe: g.nameDe,
				nameEn: g.nameEn,
				price: g.price,
				variants: g.variants,
				affordable:
					(g.mandatory ? overview.balance : overview.balance - overview.reserved) +
						(g.advance ? overview.pending : 0) >=
					g.price
			})),
		history: history
			.slice(0, 15)
			.map((h) => ({ ...h, createdAt: h.createdAt.toISOString(), shiftStartsAt: null }))
	};
};

const claimId = z.object({ claimId: uuid });

export const actions: Actions = {
	checkIn: async (event) => {
		const { ctx } = await context(event);
		const parsed = parseForm(
			z.object({ assignmentId: uuid, attendance: z.enum(['attended', 'unknown']) }),
			await event.request.formData()
		);
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const tz = (await getSettings(db())).timezone;
		const result = await attempt(() =>
			setAttendance(
				{ db: db(), now: new Date() },
				actorOf(event),
				ctx.authz,
				parsed.data.assignmentId,
				parsed.data.attendance,
				tz
			)
		);
		if (!result.ok) return result.failure;
		return { success: 'admin.desk.done' };
	},
	issue: async (event) => {
		const { access } = await context(event);
		if (!access.issue) error(403, 'error.forbidden');
		const parsed = parseForm(claimId, await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			issueClaim(db(), actorOf(event), parsed.data.claimId, new Date())
		);
		if (!result.ok) return result.failure;
		return { success: 'admin.desk.done' };
	},
	refunded: async (event) => {
		const { access } = await context(event);
		if (!access.issue) error(403, 'error.forbidden');
		const parsed = parseForm(claimId, await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			markRefunded(db(), actorOf(event), parsed.data.claimId, new Date())
		);
		if (!result.ok) return result.failure;
		return { success: 'admin.desk.done' };
	},
	cancel: async (event) => {
		const { access } = await context(event);
		if (!access.issue) error(403, 'error.forbidden');
		const parsed = parseForm(claimId, await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() => cancelClaim(db(), actorOf(event), parsed.data.claimId));
		if (!result.ok) return result.failure;
		return { success: 'admin.desk.done' };
	},
	handOut: async (event) => {
		const { access, person } = await context(event);
		if (!access.issue) error(403, 'error.forbidden');
		const parsed = parseForm(
			z.object({ goodieId: uuid, variant: z.string().optional() }),
			await event.request.formData()
		);
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			issueDirectly(
				db(),
				actorOf(event),
				person.id,
				parsed.data.goodieId,
				parsed.data.variant || null,
				new Date()
			)
		);
		if (!result.ok) return result.failure;
		return { success: 'admin.desk.done' };
	},
	adjust: async (event) => {
		const { access, person, edition } = await context(event);
		if (!access.adjust) error(403, 'error.forbidden');
		const parsed = parseForm(
			z.object({
				amount: z.coerce.number('error.invalidNumber').int('error.invalidNumber'),
				reason: requiredText(300)
			}),
			await event.request.formData()
		);
		if (!parsed.ok)
			return fail(400, { action: 'adjust', errors: parsed.errors, values: parsed.values });
		const result = await attempt(
			() =>
				adjustPoints(db(), actorOf(event), {
					userId: person.id,
					editionId: edition.id,
					...parsed.data
				}),
			{ action: 'adjust', values: parsed.values }
		);
		if (!result.ok) return result.failure;
		return { success: 'admin.desk.done' };
	}
};
