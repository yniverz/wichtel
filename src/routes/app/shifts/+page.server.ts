import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { attempt, requireVerifiedUser } from '#lib/server/guards.ts';
import { helperShiftsView } from '#lib/server/helper-shifts.ts';
import { shiftViewGate } from '#lib/server/gate.ts';
import { ALL_DAYS, pickDay, summariseDays } from '#lib/domain/shift-days.ts';
import type { Authz } from '#lib/domain/permissions.ts';
import type { User } from '#lib/server/db/schema.ts';
import {
	acceptHold,
	bookPosition,
	cancelOwnAssignment,
	joinWaitlist,
	type BookingOptions
} from '#lib/server/services/assignments.ts';
import { bookForGroup, getGroup } from '#lib/server/services/groups.ts';
import { createOffer, takeOffer, withdrawOffer } from '#lib/server/services/swaps.ts';
import { bookingAccess } from '#lib/server/services/waves.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { loadAuthz } from '#lib/server/services/roles.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { optionalEmail, parseForm, uuid } from '#lib/server/validation.ts';
import { directOfferLimiter } from '#lib/server/limits.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireVerifiedUser(event);
	const database = db();
	const edition = await getCurrentEdition(database);
	const settings = await getSettings(database);
	const features = {
		swap: settings.swapEnabled,
		groupHoldHours: settings.groupHoldHours
	};
	if (!edition)
		return {
			shifts: [],
			day: ALL_DAYS,
			days: [],
			areas: [],
			anyMarket: false,
			bookingOpensAt: null,
			bookingClosed: false,
			timezone: settings.timezone,
			sitePlanAssetId: null,
			buddies: [],
			features
		};
	const authz = await loadAuthz(database, user, edition.id);
	const group = settings.buddyGroupsEnabled ? await getGroup(database, user.id, edition.id) : null;
	const list = await shiftViewGate.run(() => shiftList(event.url, user, authz, edition.id));
	if (!list) error(503, 'error.busy');
	return {
		...list.value,
		sitePlanAssetId: edition.sitePlanAssetId,
		timezone: settings.timezone,
		/** The other group members, for booking together. */
		buddies: (group?.members ?? [])
			.filter((m) => m.userId !== user.id)
			.map((m) => ({ id: m.userId, name: `${m.firstName} ${m.lastName}` })),
		features
	};
};

/**
 * The shifts of one day (`?day=`, see `pickDay`), plus what the filters need to know about all
 * visible shifts: the days, the areas, whether anything is on the market, when booking opens.
 */
async function shiftList(url: URL, user: User, authz: Authz, editionId: string) {
	const view = await helperShiftsView(db(), user, authz, editionId, new Date());
	const all = view.shifts.map((shift) => ({ shift, facts: view.facts(shift) }));
	const days = summariseDays(all.map((s) => s.facts));
	const focus = url.searchParams.get('shift');
	const day = pickDay(
		days,
		url.searchParams.get('day'),
		all.find((s) => s.shift.id === focus)?.facts.day ?? null
	);

	const areas = new Map<string, { id: string; nameDe: string; nameEn: string }>();
	for (const { facts } of all) if (facts.rootArea) areas.set(facts.rootArea.id, facts.rootArea);

	// Booking closed for every upcoming shift: say once when it opens.
	const upcoming = all.filter((s) => !s.facts.past);
	const bookingClosed = upcoming.length > 0 && !upcoming.some((s) => s.facts.bookingOpen);
	const opensAt = upcoming
		.map((s) => s.facts.bookingOpensAt?.getTime())
		.filter((t) => t !== undefined)
		.sort((a, b) => a - b)[0];

	return {
		day,
		days: days.map(({ day, count }) => ({ day, count })),
		shifts: all
			.filter((s) => day === ALL_DAYS || s.facts.day === day)
			.map((s) => view.build(s.shift)),
		areas: [...areas.values()],
		anyMarket: all.some((s) => s.facts.onMarket),
		bookingClosed,
		bookingOpensAt: bookingClosed && opensAt !== undefined ? new Date(opensAt).toISOString() : null
	};
}

export const actions: Actions = {
	book: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(z.object({ positionId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const database = db();
		const edition = await getCurrentEdition(database);
		if (!edition) return fail(400, { error: 'error.notFound' });
		const result = await attempt(async () =>
			bookPosition(
				{ db: database, now: new Date() },
				user.id,
				parsed.data.positionId,
				await bookingOptions(user, edition.id)
			)
		);
		if (!result.ok) return result.failure;
		return {
			success: result.value.status === 'requested' ? 'shifts.requested' : 'shifts.booked',
			shiftId: result.value.shiftId
		};
	},
	cancel: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(z.object({ assignmentId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			cancelOwnAssignment({ db: db(), now: new Date() }, user.id, parsed.data.assignmentId)
		);
		if (!result.ok) return result.failure;
		return { success: 'shifts.cancelled' };
	},
	waitlist: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(z.object({ positionId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const edition = await getCurrentEdition(db());
		if (!edition) return fail(400, { error: 'error.notFound' });
		const result = await attempt(async () =>
			joinWaitlist(
				{ db: db(), now: new Date() },
				user.id,
				parsed.data.positionId,
				await bookingOptions(user, edition.id)
			)
		);
		if (!result.ok) return result.failure;
		return { success: 'shifts.waitlist.joined' };
	},
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
	offer: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(
			z.object({ assignmentId: uuid, email: optionalEmail }),
			await event.request.formData()
		);
		if (!parsed.ok)
			return fail(400, { action: 'offer', errors: parsed.errors, values: parsed.values });
		if (parsed.data.email && !directOfferLimiter.attempt(user.id)) {
			return fail(429, { action: 'offer', error: 'error.rateLimited', values: parsed.values });
		}
		const result = await attempt(
			() =>
				createOffer({ db: db(), now: new Date() }, user.id, {
					assignmentId: parsed.data.assignmentId,
					toEmail: parsed.data.email || null
				}),
			{ action: 'offer', values: parsed.values }
		);
		if (!result.ok) return result.failure;
		return { success: 'shifts.giveAway.offered' };
	},
	withdrawOffer: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(z.object({ offerId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const result = await attempt(() =>
			withdrawOffer({ db: db(), now: new Date() }, user.id, parsed.data.offerId)
		);
		if (!result.ok) return result.failure;
		return { success: 'shifts.offer.withdrawn' };
	},
	take: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(z.object({ offerId: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const edition = await getCurrentEdition(db());
		if (!edition) return fail(400, { error: 'error.notFound' });
		const opts = await bookingOptions(user, edition.id);
		const result = await attempt(() =>
			takeOffer({ db: db(), now: new Date() }, user.id, parsed.data.offerId, opts)
		);
		if (!result.ok) return result.failure;
		return {
			success: result.value === 'pending_approval' ? 'shifts.market.pending' : 'shifts.market.taken'
		};
	},
	bookGroup: async (event) => {
		const user = requireVerifiedUser(event);
		const parsed = parseForm(
			z.object({ positionId: uuid, 'members[]': z.array(z.uuid()).default([]) }),
			await event.request.formData()
		);
		if (!parsed.ok) return fail(400, { error: 'error.notFound' });
		const edition = await getCurrentEdition(db());
		if (!edition) return fail(400, { error: 'error.notFound' });
		const opts = await bookingOptions(user, edition.id);
		const result = await attempt(() =>
			bookForGroup(
				{ db: db(), now: new Date() },
				user,
				parsed.data.positionId,
				parsed.data['members[]'],
				opts
			)
		);
		if (!result.ok) return result.failure;
		if (!result.value.ok) {
			return fail(409, {
				action: 'bookGroup',
				positionId: parsed.data.positionId,
				problems: result.value.problems
			});
		}
		return { success: 'shifts.group.done', count: result.value.reserved };
	}
};

/** Visibility and booking-window checks for one person. */
async function bookingOptions(
	user: { id: string; isAdmin: boolean },
	editionId: string
): Promise<BookingOptions> {
	const now = new Date();
	const [authz, access] = await Promise.all([
		loadAuthz(db(), user, editionId),
		bookingAccess(db(), user, editionId, now)
	]);
	return {
		editionId,
		canSee: (shift) => shift.visibility === 'public' || authz.hasRoleCovering(shift.areaId),
		isOpen: (shift) => access(shift.areaId).open
	};
}
