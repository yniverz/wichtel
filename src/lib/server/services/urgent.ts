import { and, eq, gt, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm';
import { freeSpots } from '#lib/domain/booking.ts';
import { canCallUrgent } from '#lib/domain/collaboration.ts';
import type { Authz } from '#lib/domain/permissions.ts';
import { localized, translator } from '#lib/i18n/index.ts';
import type { DB, Tx } from '../db/client.ts';
import {
	assignments,
	roleAssignments,
	shiftPositions,
	shifts,
	userQualifications,
	users,
	type Shift,
	type ShiftPosition,
	type User
} from '../db/schema.ts';
import { audit, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { appUrl, placesOf, sendTemplate, shiftParams } from '../notifications.ts';
import { countActive, lockPosition } from './assignments.ts';
import { loadAuthz } from './roles.ts';
import { getSettings } from './settings.ts';

const MINUTE = 60_000;

/**
 * People who could step in: verified accounts that are not on the shift yet, hold the required
 * qualifications, have no overlapping shift and – for internal shifts – a role covering the area.
 */
export async function urgentCandidates(
	db: Tx,
	shift: Shift,
	position: ShiftPosition,
	now: Date
): Promise<User[]> {
	const settings = await getSettings(db);
	let people = await db.select().from(users).where(isNotNull(users.emailVerifiedAt));

	const gap = settings.minBreakMinutes * MINUTE;
	const busy = await db
		.select({ userId: assignments.userId })
		.from(assignments)
		.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
		.where(
			and(
				inArray(assignments.status, ['booked', 'requested', 'held', 'waitlisted']),
				or(
					eq(assignments.shiftId, shift.id),
					and(
						lt(shifts.startsAt, new Date(shift.endsAt.getTime() + gap)),
						gt(shifts.endsAt, new Date(shift.startsAt.getTime() - gap))
					)
				)
			)
		);
	const excluded = new Set(busy.map((b) => b.userId));
	people = people.filter((p) => !excluded.has(p.id));

	for (const qualificationId of position.requiredQualificationIds) {
		const holders = await db
			.select({ userId: userQualifications.userId })
			.from(userQualifications)
			.where(
				and(
					eq(userQualifications.qualificationId, qualificationId),
					eq(userQualifications.status, 'approved'),
					or(isNull(userQualifications.expiresAt), gt(userQualifications.expiresAt, now))
				)
			);
		const ids = new Set(holders.map((h) => h.userId));
		people = people.filter((p) => ids.has(p.id));
	}

	if (shift.visibility === 'internal') {
		const crew = await db
			.selectDistinct({ userId: roleAssignments.userId })
			.from(roleAssignments)
			.where(eq(roleAssignments.editionId, shift.editionId));
		const crewIds = new Set(crew.map((c) => c.userId));
		const visible: User[] = [];
		for (const p of people) {
			if (!p.isAdmin && !crewIds.has(p.id)) continue;
			const authz = await loadAuthz(db, p, shift.editionId);
			if (authz.hasRoleCovering(shift.areaId)) visible.push(p);
		}
		people = visible;
	}
	return people;
}

async function requireUrgentRights(tx: Tx, authz: Authz, positionId: string) {
	const { position, shift } = await lockPosition(tx, positionId);
	if (!authz.can('assignment.manage', shift.areaId)) throw new DomainError('forbidden');
	return { position, shift };
}

/**
 * A lead calls for urgent help on a position: matching people get an e-mail with a direct link,
 * and whoever books while the call is active earns `bonus` extra points. Returns the number of
 * people reached.
 */
export async function callUrgent(
	db: DB,
	actor: Actor,
	authz: Authz,
	positionId: string,
	input: { bonus: number; note: string },
	now: Date
): Promise<number> {
	return db.transaction(async (tx) => {
		const { position, shift } = await requireUrgentRights(tx, authz, positionId);
		if (shift.startsAt.getTime() <= now.getTime()) throw new DomainError('shiftStarted');
		const { booked } = await countActive(tx, position.id);
		const free = freeSpots(position.capacity, booked);
		if (free === 0) throw new DomainError('positionFull');
		if (!canCallUrgent(position.urgentAt, now)) throw new DomainError('urgentTooSoon');

		await tx
			.update(shiftPositions)
			.set({ urgentAt: now, urgentBonus: input.bonus, urgentNote: input.note })
			.where(eq(shiftPositions.id, position.id));

		const settings = await getSettings(tx);
		const shiftPlaces = await placesOf(tx, shift);
		const people = await urgentCandidates(tx, shift, position, now);
		for (const person of people) {
			await sendTemplate(tx, 'urgent_call', person, {
				...shiftParams(shift, person.locale, settings.timezone, shiftPlaces),
				position: localized(position, 'name', person.locale),
				free: String(free),
				bonus:
					input.bonus > 0
						? `\n${translator(person.locale)('shifts.urgentBonus', { bonus: input.bonus })}`
						: '',
				note: input.note ? `\n\n${input.note}` : '',
				link: appUrl(`/app/shifts?shift=${shift.id}`)
			});
		}
		await audit(tx, actor, {
			action: 'shift.urgent_call',
			entityType: 'shift',
			entityId: shift.id,
			editionId: shift.editionId,
			data: { positionId, bonus: input.bonus, recipients: people.length }
		});
		return people.length;
	});
}

/** Ends an urgent call; later bookings no longer earn the bonus. */
export async function endUrgent(db: DB, actor: Actor, authz: Authz, positionId: string) {
	await db.transaction(async (tx) => {
		const { position, shift } = await requireUrgentRights(tx, authz, positionId);
		if (!position.urgentAt) return;
		await tx
			.update(shiftPositions)
			.set({ urgentAt: null, urgentBonus: 0, urgentNote: '' })
			.where(eq(shiftPositions.id, position.id));
		await audit(tx, actor, {
			action: 'shift.urgent_end',
			entityType: 'shift',
			entityId: shift.id,
			editionId: shift.editionId,
			data: { positionId }
		});
	});
}
