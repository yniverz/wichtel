import { canSelfCancel, cancelDeadline, freeSpots, overlaps } from '#lib/domain/booking.ts';
import type { Authz } from '#lib/domain/permissions.ts';
import { utcToZoned } from '#lib/domain/time.ts';
import type { DB } from './db/client.ts';
import type { Shift, User } from './db/schema.ts';
import { loadAreaTree } from './services/areas.ts';
import { cancelHoursForShifts, listUserAssignments } from './services/assignments.ts';
import { listShifts } from './services/shifts.ts';
import { getSettings } from './services/settings.ts';
import { pointsFor } from './services/points.ts';

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
	}[];
	mine: {
		assignmentId: string;
		positionId: string;
		status: 'booked' | 'requested' | 'rejected';
		cancelUntil: string | null;
		canCancel: boolean;
	} | null;
	/** Overlaps with one of the user's active assignments (including the required break). */
	conflict: boolean;
}

/** Builds the volunteer's view of all shifts of an edition. */
export async function loadHelperShifts(
	db: DB,
	user: Pick<User, 'id'>,
	authz: Authz,
	editionId: string,
	now: Date
): Promise<HelperShift[]> {
	const [settings, tree, all, mine] = await Promise.all([
		getSettings(db),
		loadAreaTree(db, editionId),
		listShifts(db, editionId),
		listUserAssignments(db, user.id, editionId)
	]);
	const tz = settings.timezone;
	// Prefer active assignments over old rejected/cancelled ones of the same shift.
	const rank = { booked: 3, requested: 2, rejected: 1, cancelled: 0 } as const;
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
		if (a && (a.status === 'booked' || a.status === 'requested'))
			activeIntervals.push({ shiftId: s.id, startsAt: s.startsAt, endsAt: s.endsAt });
	}
	const cancelHours = await cancelHoursForShifts(
		db,
		editionId,
		visible.filter((s) => mineByShift.get(s.id)?.status === 'booked') as Shift[]
	);

	return visible.map((s) => {
		const path = [...tree.path(s.areaId), tree.get(s.areaId)].filter((a) => a !== undefined);
		const a = mineByShift.get(s.id);
		const activeMine = a && a.status !== 'cancelled' ? a : null;
		const hours = cancelHours.get(s.id);
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
			day: utcToZoned(s.startsAt, tz).date,
			past: s.startsAt.getTime() <= now.getTime(),
			positions: s.positions.map((p) => ({
				id: p.id,
				nameDe: p.nameDe,
				nameEn: p.nameEn,
				descriptionDe: p.descriptionDe,
				descriptionEn: p.descriptionEn,
				capacity: p.capacity,
				free: freeSpots(p.capacity, p.booked),
				mode: p.bookingMode,
				points: pointsFor(s, p, tree, settings).total
			})),
			mine: activeMine
				? {
						assignmentId: activeMine.id,
						positionId: activeMine.positionId,
						status: activeMine.status as 'booked' | 'requested' | 'rejected',
						cancelUntil:
							activeMine.status === 'booked' && hours !== undefined
								? cancelDeadline(s.startsAt, hours).toISOString()
								: null,
						canCancel:
							s.startsAt.getTime() > now.getTime() &&
							(activeMine.status === 'requested' ||
								(activeMine.status === 'booked' &&
									hours !== undefined &&
									canSelfCancel(now, s.startsAt, hours)))
					}
				: null,
			conflict: activeIntervals.some(
				(iv) => iv.shiftId !== s.id && overlaps(iv, s, settings.minBreakMinutes)
			)
		};
	});
}
