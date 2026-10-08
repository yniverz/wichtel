import { error, fail } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { assignments, users, type User } from '#lib/server/db/schema.ts';
import { attempt, requireUser, requireVerifiedUser } from '#lib/server/guards.ts';
import { helperShiftsView } from '#lib/server/helper-shifts.ts';
import { shiftViewGate } from '#lib/server/gate.ts';
import type { Authz } from '#lib/domain/permissions.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { bookingAccess } from '#lib/server/services/waves.ts';
import { loadAuthz } from '#lib/server/services/roles.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { fieldsFor, listFields, missingRequired, valuesOf } from '#lib/server/services/fields.ts';
import { listPlaces, placeView } from '#lib/server/services/places.ts';
import { pointsBalance } from '#lib/server/services/points.ts';
import { getGroup } from '#lib/server/services/groups.ts';
import { acceptHold, cancelOwnAssignment } from '#lib/server/services/assignments.ts';
import {
	answerProposal,
	declineOffer,
	offersInvolving,
	takeOffer
} from '#lib/server/services/swaps.ts';
import { checkbox, optionalUuid, parseForm, uuid } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

const shiftRef = (s: {
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
	const user = requireUser(event);
	const database = db();
	const edition = await getCurrentEdition(database);
	const settings = await getSettings(database);
	const timezone = settings.timezone;
	const missingFields =
		missingRequired(
			fieldsFor(await listFields(database), 'profile'),
			await valuesOf(database, user.id)
		).length > 0;
	const empty = {
		mine: [],
		timezone,
		openShifts: 0,
		missingFields,
		desk: null,
		sitePlanAssetId: null,
		points: 0,
		todo: { holds: [], offers: [], proposals: [], pending: [] },
		urgent: [],
		group: null,
		groupsEnabled: settings.buddyGroupsEnabled,
		counterOptions: []
	};
	if (!edition || !user.emailVerifiedAt) return empty;

	const now = new Date();
	const authz = await loadAuthz(database, user, edition.id);
	const [summary, desk, points, offers, group] = await Promise.all([
		shiftViewGate.run(() => homeShifts(user, authz, edition.id, now)),
		edition.deskPlaceId
			? listPlaces(database, edition.id).then((list) =>
					list.find((p) => p.id === edition.deskPlaceId)
				)
			: Promise.resolve(undefined),
		pointsBalance(database, user.id, edition.id),
		offersInvolving(database, user.id, edition.id, now),
		settings.buddyGroupsEnabled ? getGroup(database, user.id, edition.id) : null
	]);

	if (!summary) error(503, 'error.busy');
	const { shifts, openShifts, urgent } = summary.value;

	// Places reserved by a group member: who reserved them.
	const holds = shifts.filter((s) => s.mine?.status === 'held' && !s.past);
	const holdIds = holds.map((s) => s.mine!.assignmentId);
	const reservedBy = holdIds.length
		? await database
				.select({ id: assignments.id, firstName: users.firstName })
				.from(assignments)
				.innerJoin(users, eq(assignments.createdBy, users.id))
				.where(and(inArray(assignments.id, holdIds), eq(assignments.userId, user.id)))
		: [];
	const byHold = new Map(reservedBy.map((r) => [r.id, r.firstName]));

	const mine = shifts.filter((s) => s.mine && s.mine.status !== 'rejected' && !s.past);
	return {
		desk: desk ? placeView(desk) : null,
		sitePlanAssetId: edition.sitePlanAssetId,
		timezone,
		points,
		mine,
		missingFields,
		openShifts,
		todo: {
			holds: holds.map((s) => ({
				assignmentId: s.mine!.assignmentId,
				holdUntil: s.mine!.holdUntil,
				person: byHold.get(s.mine!.assignmentId) ?? '',
				shift: {
					id: s.id,
					titleDe: s.titleDe,
					titleEn: s.titleEn,
					startsAt: s.startsAt,
					endsAt: s.endsAt
				}
			})),
			offers: offers
				.filter((o) => o.toUserId === user.id && o.status === 'open')
				.map((o) => ({
					id: o.id,
					person: o.from ? `${o.from.firstName} ${o.from.lastName}` : '',
					shift: shiftRef(o.shift)
				})),
			proposals: offers
				.filter((o) => o.fromUserId === user.id && o.status === 'proposed' && o.counter)
				.map((o) => ({
					id: o.id,
					person: o.taker ? `${o.taker.firstName} ${o.taker.lastName}` : '',
					give: shiftRef(o.shift),
					get: shiftRef(o.counter!)
				})),
			pending: offers
				.filter((o) => o.status === 'pending_approval')
				.map((o) => ({ id: o.id, shift: shiftRef(o.shift) }))
		},
		// Own bookings that could be given in return for a direct offer.
		counterOptions: mine
			.filter((s) => s.mine?.status === 'booked' && !s.mine.offer)
			.map((s) => ({
				assignmentId: s.mine!.assignmentId,
				titleDe: s.titleDe,
				titleEn: s.titleEn,
				startsAt: s.startsAt
			})),
		urgent: urgent.map((s) => ({
			id: s.id,
			titleDe: s.titleDe,
			titleEn: s.titleEn,
			startsAt: s.startsAt,
			endsAt: s.endsAt,
			day: s.day,
			bonus: Math.max(...s.positions.map((p) => p.urgent?.bonus ?? 0))
		})),
		group: group && { name: group.name, size: group.members.length },
		groupsEnabled: settings.buddyGroupsEnabled
	};
};

/**
 * The person's own shifts (fully built), the number of shifts with free places and the first
 * urgent calls. Only the shifts that are shown get built.
 */
async function homeShifts(user: User, authz: Authz, editionId: string, now: Date) {
	const view = await helperShiftsView(db(), user, authz, editionId, now);
	const all = view.shifts.map((shift) => ({ shift, facts: view.facts(shift) }));
	return {
		shifts: all.filter((s) => s.facts.mine).map((s) => view.build(s.shift)),
		openShifts: all.filter((s) => s.facts.open).length,
		urgent: all
			.filter((s) => s.facts.urgent && !s.facts.mine)
			.slice(0, 3)
			.map((s) => view.build(s.shift))
	};
}

async function editionId() {
	const edition = await getCurrentEdition(db());
	if (!edition) throw new Error('No current edition');
	return edition.id;
}

export const actions: Actions = {
	acceptHold: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(z.object({ assignmentId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			acceptHold({ db: db(), now: new Date() }, user.id, parsed.data.assignmentId)
		);
		if (!result.ok) return result.failure;
		return { success: 'shifts.hold.accepted' };
	},
	declineHold: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(z.object({ assignmentId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			cancelOwnAssignment({ db: db(), now: new Date() }, user.id, parsed.data.assignmentId)
		);
		if (!result.ok) return result.failure;
		return { success: 'shifts.hold.declined' };
	},
	take: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(
			z.object({ offerId: uuid, counterAssignmentId: optionalUuid }),
			await event.request.formData()
		);
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const id = await editionId();
		const authz = await loadAuthz(db(), user, id);
		const access = id ? await bookingAccess(db(), user, id, new Date()) : null;
		const result = await attempt(() =>
			takeOffer({ db: db(), now: new Date() }, user.id, parsed.data.offerId, {
				editionId: id,
				isOpen: (shift) => access?.(shift.areaId).open ?? false,
				canSee: (shift) => shift.visibility === 'public' || authz.hasRoleCovering(shift.areaId),
				counterAssignmentId: parsed.data.counterAssignmentId
			})
		);
		if (!result.ok) return result.failure;
		return {
			success:
				result.value === 'pending_approval'
					? 'shifts.market.pending'
					: result.value === 'proposed'
						? 'app.home.todo.done'
						: 'shifts.market.taken'
		};
	},
	decline: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(z.object({ offerId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			declineOffer({ db: db(), now: new Date() }, user.id, parsed.data.offerId)
		);
		if (!result.ok) return result.failure;
		return { success: 'app.home.todo.done' };
	},
	answer: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(
			z.object({ offerId: uuid, accept: checkbox }),
			await event.request.formData()
		);
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			answerProposal(
				{ db: db(), now: new Date() },
				user.id,
				parsed.data.offerId,
				parsed.data.accept
			)
		);
		if (!result.ok) return result.failure;
		return {
			success: result.value === 'pending_approval' ? 'shifts.market.pending' : 'app.home.todo.done'
		};
	}
};
