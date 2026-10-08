import { error } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { utcToZoned } from '#lib/domain/time.ts';
import type { Tx } from './db/client.ts';
import { assignments, goodieClaims, pointsLedger, shiftPositions, shifts } from './db/schema.ts';
import type { AdminContext } from './guards.ts';

export function deskAccess(ctx: AdminContext) {
	const access = {
		issue: ctx.authz.canSomewhere('goodie.issue'),
		checkIn: ctx.authz.canSomewhere('attendance.confirm'),
		adjust: ctx.authz.can('points.adjust'),
		contact: ctx.authz.canSomewhere('helper.contact.view')
	};
	if (!access.issue && !access.checkIn && !access.adjust) error(403, 'error.forbidden');
	return access;
}

/**
 * People who take part in an edition: with a shift (any status), a goodie or points there. Desk
 * staff only see these, not every account of the instance.
 */
export async function involvedInEdition(db: Tx, userIds: string[], editionId: string) {
	if (userIds.length === 0) return new Set<string>();
	const [a, c, p] = await Promise.all([
		db
			.selectDistinct({ id: assignments.userId })
			.from(assignments)
			.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
			.where(and(eq(shifts.editionId, editionId), inArray(assignments.userId, userIds))),
		db
			.selectDistinct({ id: goodieClaims.userId })
			.from(goodieClaims)
			.where(and(eq(goodieClaims.editionId, editionId), inArray(goodieClaims.userId, userIds))),
		db
			.selectDistinct({ id: pointsLedger.userId })
			.from(pointsLedger)
			.where(and(eq(pointsLedger.editionId, editionId), inArray(pointsLedger.userId, userIds)))
	]);
	return new Set([...a, ...c, ...p].map((r) => r.id));
}

/** Booked shifts of a person that start today or are running right now (festival time zone). */
export async function shiftsForCheckIn(
	db: Tx,
	userId: string,
	editionId: string,
	now: Date,
	timeZone: string
) {
	const today = utcToZoned(now, timeZone).date;
	const rows = await db
		.select({
			assignmentId: assignments.id,
			attendance: assignments.attendance,
			shiftId: shifts.id,
			areaId: shifts.areaId,
			titleDe: shifts.titleDe,
			titleEn: shifts.titleEn,
			startsAt: shifts.startsAt,
			endsAt: shifts.endsAt,
			positionDe: shiftPositions.nameDe,
			positionEn: shiftPositions.nameEn
		})
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.innerJoin(shiftPositions, eq(assignments.positionId, shiftPositions.id))
		.where(
			and(
				eq(assignments.userId, userId),
				eq(shifts.editionId, editionId),
				eq(assignments.status, 'booked')
			)
		)
		.orderBy(asc(shifts.startsAt));
	return rows.filter(
		(r) =>
			utcToZoned(r.startsAt, timeZone).date === today ||
			(r.startsAt.getTime() <= now.getTime() && now.getTime() < r.endsAt.getTime())
	);
}
