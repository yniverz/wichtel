import { canSelfCancel, cancelDeadline, freeSpots, overlaps } from '#lib/domain/booking.ts';
import type { Authz } from '#lib/domain/permissions.ts';
import { utcToZoned } from '#lib/domain/time.ts';
import type { DB } from './db/client.ts';
import type { Shift, User } from './db/schema.ts';
import { loadAreaTree } from './services/areas.ts';
import {
	cancelHoursForShifts,
	listUserAssignments,
	waitlistQueue
} from './services/assignments.ts';
import { listShifts, type ShiftWithPositions } from './services/shifts.ts';
import { getSettings } from './services/settings.ts';
import { pointsFor } from './services/points.ts';
import { heldQualificationIds, listQualifications } from './services/qualifications.ts';
import { bookingAccess } from './services/waves.ts';
import { listPlaces, placeView, type PlaceView } from './services/places.ts';
import { marketOffers, offersInvolving } from './services/swaps.ts';
import { buddiesByShift, getGroup } from './services/groups.ts';

export type MyStatus = 'booked' | 'requested' | 'rejected' | 'waitlisted' | 'held';

/** What a volunteer sees of one shift. Only data that is safe to show to every helper. */
export interface HelperShift {
	id: string;
	titleDe: string;
	titleEn: string;
	descriptionDe: string;
	descriptionEn: string;
	areaPath: { nameDe: string; nameEn: string }[];
	areaRootId: string;
	location: string;
	meetingPoint: string;
	contact: string;
	internal: boolean;
	startsAt: string;
	endsAt: string;
	/** Festival-local day of the start, YYYY-MM-DD */
	day: string;
	past: boolean;
	positions: {
		id: string;
		nameDe: string;
		nameEn: string;
		descriptionDe: string;
		descriptionEn: string;
		capacity: number;
		free: number;
		mode: 'open' | 'request';
		points: number;
		required: { id: string; nameDe: string; nameEn: string; held: boolean }[];
		preferred: { nameDe: string; nameEn: string }[];
		waitlisted: number;
		/** A place someone offers on the shift market (taking it moves their booking to you). */
		marketOfferId: string | null;
		/** Active urgent call: bonus points for booking now. */
		urgent: { bonus: number; note: string } | null;
	}[];
	mine: {
		assignmentId: string;
		positionId: string;
		status: MyStatus;
		cancelUntil: string | null;
		canCancel: boolean;
		/** 1-based place on the waiting list. */
		waitlistPlace: number | null;
		/** Reserved by the group until then (status `held`). */
		holdUntil: string | null;
		/** The running swap offer for this booking. */
		offer: { id: string; status: string; toName: string | null } | null;
	} | null;
	/** First names of the person's group members on this shift. */
	buddies: string[];
	locationPlace: PlaceView | null;
	meetingPlace: PlaceView | null;
	/** Whether booking is open for this person (waves); if not, when it opens. */
	bookingOpen: boolean;
	bookingOpensAt: string | null;
	waitlistEnabled: boolean;
	/** Overlaps with one of the user's active assignments (including the required break). */
	conflict: boolean;
}

/** Cheap facts about a visible shift, for summaries over all of them (day tabs, filters). */
export interface ShiftFacts {
	/** Festival-local day of the start, YYYY-MM-DD */
	day: string;
	rootArea: { id: string; nameDe: string; nameEn: string } | null;
	past: boolean;
	/** The person has an assignment here that is not cancelled (`HelperShift.mine`). */
	mine: boolean;
	/** Not started and at least one place free. */
	open: boolean;
	/** Someone else offers a place here on the shift market (and the person is not on it). */
	onMarket: boolean;
	/** An urgent call is running on a position with free places. */
	urgent: boolean;
	bookingOpen: boolean;
	bookingOpensAt: Date | null;
}

export interface HelperShiftsView {
	/**
	 * The shifts the person may see: public ones, internal ones of areas they have a role in, and
	 * those they have (had) an assignment in. Ordered by start.
	 */
	shifts: ShiftWithPositions[];
	facts(shift: ShiftWithPositions): ShiftFacts;
	/** What the person sees of one shift. Only builds the shifts that are shown. */
	build(shift: ShiftWithPositions): HelperShift;
}

/** Loads everything needed to show an edition's shifts to one volunteer. */
export async function helperShiftsView(
	db: DB,
	user: Pick<User, 'id' | 'isAdmin'>,
	authz: Authz,
	editionId: string,
	now: Date
): Promise<HelperShiftsView> {
	const [
		settings,
		tree,
		all,
		mine,
		quals,
		heldIds,
		access,
		queue,
		placeList,
		market,
		offers,
		group
	] = await Promise.all([
		getSettings(db),
		loadAreaTree(db, editionId),
		listShifts(db, editionId, { cached: true }),
		listUserAssignments(db, user.id, editionId),
		listQualifications(db),
		heldQualificationIds(db, user.id, now),
		bookingAccess(db, user, editionId, now),
		waitlistQueue(db, editionId),
		listPlaces(db, editionId),
		marketOffers(db, editionId, now),
		offersInvolving(db, user.id, editionId, now),
		getGroup(db, user.id, editionId)
	]);
	const buddies = await buddiesByShift(db, group, user.id);
	const marketByPosition = new Map<string, string>();
	for (const o of market) {
		if (o.fromUserId !== user.id && !marketByPosition.has(o.positionId))
			marketByPosition.set(o.positionId, o.id);
	}
	const myOffers = new Map(
		offers.filter((o) => o.fromUserId === user.id).map((o) => [o.assignmentId, o])
	);
	const placesById = new Map(placeList.map((p) => [p.id, placeView(p)]));
	const qualificationsById = new Map(quals.map((q) => [q.id, q]));
	const held = new Set(heldIds);
	const tz = settings.timezone;
	// Prefer active assignments over old rejected/cancelled ones of the same shift.
	const rank = { booked: 5, held: 4, requested: 3, waitlisted: 2, rejected: 1, cancelled: 0 };
	const mineByShift = new Map<string, (typeof mine)[number]>();
	for (const a of mine) {
		const existing = mineByShift.get(a.shiftId);
		if (!existing || rank[a.status] > rank[existing.status]) mineByShift.set(a.shiftId, a);
	}
	const visible = all.filter(
		(s) => s.visibility === 'public' || authz.hasRoleCovering(s.areaId) || mineByShift.has(s.id)
	);

	const activeIntervals: { shiftId: string; startsAt: Date; endsAt: Date }[] = [];
	for (const s of all) {
		const a = mineByShift.get(s.id);
		if (a && (a.status === 'booked' || a.status === 'requested' || a.status === 'held'))
			activeIntervals.push({ shiftId: s.id, startsAt: s.startsAt, endsAt: s.endsAt });
	}
	const cancelHours = await cancelHoursForShifts(
		db,
		editionId,
		visible.filter((s) => mineByShift.get(s.id)?.status === 'booked') as Shift[]
	);

	const freeOf = (p: ShiftWithPositions['positions'][number]) => freeSpots(p.capacity, p.booked);
	const marketOffer = (positionId: string) =>
		settings.swapEnabled ? (marketByPosition.get(positionId) ?? null) : null;
	// Many shifts start at the same times; converting each instant once saves noticeable time.
	const days = new Map<number, string>();
	const dayOf = (instant: Date) => {
		let day = days.get(instant.getTime());
		if (day === undefined) {
			day = utcToZoned(instant, tz).date;
			days.set(instant.getTime(), day);
		}
		return day;
	};
	const activeMineOf = (s: Shift) => {
		const a = mineByShift.get(s.id);
		return a && a.status !== 'cancelled' ? a : null;
	};

	function facts(s: ShiftWithPositions): ShiftFacts {
		const root = tree.path(s.areaId)[0] ?? tree.get(s.areaId);
		const past = s.startsAt.getTime() <= now.getTime();
		const mine = activeMineOf(s) !== null;
		const window = access(s.areaId);
		return {
			day: dayOf(s.startsAt),
			rootArea: root ? { id: root.id, nameDe: root.nameDe, nameEn: root.nameEn } : null,
			past,
			mine,
			open: !past && s.positions.some((p) => freeOf(p) > 0),
			onMarket: !past && !mine && s.positions.some((p) => marketOffer(p.id) !== null),
			urgent: !past && s.positions.some((p) => p.urgentAt !== null && freeOf(p) > 0),
			bookingOpen: window.open,
			bookingOpensAt: window.opensAt
		};
	}

	function build(s: ShiftWithPositions): HelperShift {
		const path = [...tree.path(s.areaId), tree.get(s.areaId)].filter((a) => a !== undefined);
		const activeMine = activeMineOf(s);
		const hours = cancelHours.get(s.id);
		const window = access(s.areaId);
		const past = s.startsAt.getTime() <= now.getTime();
		const offer = activeMine ? myOffers.get(activeMine.id) : undefined;
		return {
			id: s.id,
			titleDe: s.titleDe,
			titleEn: s.titleEn,
			descriptionDe: s.descriptionDe,
			descriptionEn: s.descriptionEn,
			areaPath: path.map((p) => ({ nameDe: p.nameDe, nameEn: p.nameEn })),
			areaRootId: path[0]?.id ?? s.areaId,
			location: s.location,
			meetingPoint: s.meetingPoint,
			contact: s.contact,
			internal: s.visibility === 'internal',
			startsAt: s.startsAt.toISOString(),
			endsAt: s.endsAt.toISOString(),
			day: dayOf(s.startsAt),
			past,
			buddies: buddies.get(s.id) ?? [],
			positions: s.positions.map((p) => ({
				id: p.id,
				nameDe: p.nameDe,
				nameEn: p.nameEn,
				descriptionDe: p.descriptionDe,
				descriptionEn: p.descriptionEn,
				capacity: p.capacity,
				free: freeSpots(p.capacity, p.booked),
				mode: p.bookingMode,
				points: pointsFor(s, p, tree, settings).total,
				required: p.requiredQualificationIds
					.map((id) => qualificationsById.get(id))
					.filter((q) => q !== undefined)
					.map((q) => ({ id: q.id, nameDe: q.nameDe, nameEn: q.nameEn, held: held.has(q.id) })),
				preferred: p.preferredQualificationIds
					.map((id) => qualificationsById.get(id))
					.filter((q) => q !== undefined)
					.map((q) => ({ nameDe: q.nameDe, nameEn: q.nameEn })),
				waitlisted: p.waitlisted,
				marketOfferId: settings.swapEnabled ? (marketByPosition.get(p.id) ?? null) : null,
				urgent:
					p.urgentAt && !past && freeSpots(p.capacity, p.booked) > 0
						? { bonus: p.urgentBonus, note: p.urgentNote }
						: null
			})),
			locationPlace: s.locationPlaceId ? (placesById.get(s.locationPlaceId) ?? null) : null,
			meetingPlace: s.meetingPlaceId ? (placesById.get(s.meetingPlaceId) ?? null) : null,
			bookingOpen: window.open,
			bookingOpensAt: window.opensAt?.toISOString() ?? null,
			waitlistEnabled: settings.waitlistEnabled,
			mine: activeMine
				? {
						assignmentId: activeMine.id,
						positionId: activeMine.positionId,
						status: activeMine.status as MyStatus,
						waitlistPlace:
							activeMine.status === 'waitlisted'
								? (queue.get(activeMine.positionId)?.indexOf(user.id) ?? -1) + 1 || null
								: null,
						holdUntil: activeMine.holdUntil?.toISOString() ?? null,
						offer: offer
							? {
									id: offer.id,
									status: offer.status,
									toName: offer.to ? offer.to.firstName : null
								}
							: null,
						cancelUntil:
							activeMine.status === 'booked' && hours !== undefined
								? cancelDeadline(s.startsAt, hours).toISOString()
								: null,
						canCancel:
							!past &&
							(activeMine.status === 'requested' ||
								activeMine.status === 'waitlisted' ||
								activeMine.status === 'held' ||
								(activeMine.status === 'booked' &&
									hours !== undefined &&
									canSelfCancel(now, s.startsAt, hours)))
					}
				: null,
			conflict: activeIntervals.some(
				(iv) => iv.shiftId !== s.id && overlaps(iv, s, settings.minBreakMinutes)
			)
		};
	}

	return { shifts: visible, facts, build };
}
