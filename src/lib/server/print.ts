import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Authz } from '#lib/domain/permissions.ts';
import type { AreaTree } from '#lib/domain/area-tree.ts';
import { utcToZoned } from '#lib/domain/time.ts';
import type { Tx } from './db/client.ts';
import { assignments, users, type Area } from './db/schema.ts';
import { listPlaces } from './services/places.ts';
import type { ShiftWithPositions } from './services/shifts.ts';
import type { PrintShift } from '#lib/print.ts';

/** Shifts with their crews, ready for printing. Phone numbers only where the reader may see them. */
export async function printShifts(
	db: Tx,
	list: ShiftWithPositions[],
	tree: AreaTree<Area>,
	authz: Authz,
	timeZone: string
): Promise<PrintShift[]> {
	if (list.length === 0) return [];
	const [people, placeList] = await Promise.all([
		db
			.select({
				shiftId: assignments.shiftId,
				positionId: assignments.positionId,
				status: assignments.status,
				firstName: users.firstName,
				lastName: users.lastName,
				phone: users.phone
			})
			.from(assignments)
			.innerJoin(users, eq(assignments.userId, users.id))
			.where(
				and(
					inArray(
						assignments.shiftId,
						list.map((s) => s.id)
					),
					inArray(assignments.status, ['booked', 'held'])
				)
			)
			.orderBy(asc(users.lastName), asc(users.firstName)),
		listPlaces(db, list[0].editionId)
	]);
	const placeName = (id: string | null) => placeList.find((p) => p.id === id)?.nameDe ?? '';
	return list.map((s) => {
		const showPhone = authz.can('helper.contact.view', s.areaId);
		const path = [...tree.path(s.areaId), tree.get(s.areaId)].filter((a) => a !== undefined);
		return {
			id: s.id,
			titleDe: s.titleDe,
			titleEn: s.titleEn,
			day: utcToZoned(s.startsAt, timeZone).date,
			startsAt: s.startsAt.toISOString(),
			endsAt: s.endsAt.toISOString(),
			areaPath: path.map((a) => a.nameDe).join(' › '),
			where: [
				placeName(s.meetingPlaceId) || placeName(s.locationPlaceId),
				s.meetingPoint || s.location
			]
				.filter(Boolean)
				.join(' · '),
			contact: s.contact,
			positions: s.positions.map((p) => ({
				id: p.id,
				nameDe: p.nameDe,
				nameEn: p.nameEn,
				capacity: p.capacity,
				people: people
					.filter((r) => r.positionId === p.id)
					.map((r) => ({
						name: `${r.lastName}, ${r.firstName}`,
						phone: showPhone ? r.phone : null,
						held: r.status === 'held'
					}))
			}))
		};
	});
}
