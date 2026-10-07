import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import {
	areas,
	bookingWaves,
	editions,
	goodies,
	roleAssignments,
	roles,
	shiftPositions,
	shifts,
	users
} from '../db/schema.ts';
import { createTestDatabase } from '../testing/db.ts';
import { createArea } from './areas.ts';
import { copyEdition, daysBetween } from './edition-copy.ts';
import { createEdition } from './editions.ts';
import { createPlace } from './places.ts';
import { createShift } from './shifts.ts';

let database: Database;
const actor = { userId: null };
beforeEach(async () => {
	database = await createTestDatabase();
});
afterEach(async () => {
	await database.close();
});

const areaInput = (nameDe: string, parentId: string | null) => ({
	parentId,
	nameDe,
	nameEn: '',
	descriptionDe: '',
	descriptionEn: '',
	sortOrder: 0,
	cancelDeadlineHours: 12,
	pointsPerShift: 3,
	pointsPerHour: null
});

describe('copyEdition', () => {
	it('counts days between dates', () => {
		expect(daysBetween('2026-03-25', '2026-04-01')).toBe(7);
		expect(daysBetween('2026-06-01', '2025-06-01')).toBe(-365);
	});

	it('copies the structure, moves times by whole local days and keeps no bookings', async () => {
		const db = database.db;
		const source = await createEdition(db, actor, {
			name: '2026',
			startsOn: '2026-03-25',
			endsOn: '2026-03-27'
		});
		const bar = await createArea(db, actor, source.id, areaInput('Bar', null));
		const tresen = await createArea(db, actor, source.id, areaInput('Tresen', bar.id));
		const place = await createPlace(db, actor, source.id, {
			nameDe: 'Tor 3',
			nameEn: '',
			descriptionDe: '',
			descriptionEn: '',
			address: '',
			lat: 50.1,
			lng: 8.6,
			planX: null,
			planY: null,
			sortOrder: 0
		});
		await createShift(db, actor, source.id, {
			areaId: tresen.id,
			titleDe: 'Abend',
			titleEn: '',
			descriptionDe: '',
			descriptionEn: '',
			location: '',
			meetingPoint: '',
			contact: '',
			visibility: 'public',
			cancelDeadlineHours: null,
			meetingPlaceId: place.id,
			// 10:00 in Berlin (CET, UTC+1)
			startsAt: new Date('2026-03-25T09:00:00Z'),
			endsAt: new Date('2026-03-25T13:00:00Z'),
			positions: [
				{
					nameDe: 'Theke',
					nameEn: '',
					descriptionDe: '',
					descriptionEn: '',
					capacity: 3,
					bookingMode: 'open',
					pointsPerShift: 2
				}
			]
		});
		await db
			.insert(goodies)
			.values({ editionId: source.id, nameDe: 'Shirt', requiredAreaIds: [bar.id] });
		const [role] = await db.insert(roles).values({ nameDe: 'Leitung' }).returning();
		const [user] = await db
			.insert(users)
			.values({ email: 'l@x.org', firstName: 'L', lastName: 'L' })
			.returning();
		await db.insert(roleAssignments).values({
			userId: user.id,
			roleId: role.id,
			editionId: source.id,
			areaId: bar.id
		});
		await db.insert(bookingWaves).values({
			editionId: source.id,
			name: 'Crew',
			opensAt: new Date('2026-03-01T09:00:00Z'),
			areaIds: [tresen.id]
		});

		const copy = await copyEdition(db, actor, source.id, {
			name: '2027',
			startsOn: '2026-04-01',
			places: true,
			shifts: true,
			goodies: true,
			roles: true,
			waves: true
		});
		expect(copy.endsOn).toBe('2026-04-03');
		expect(copy.isCurrent).toBe(false);

		const newAreas = await db.select().from(areas).where(eq(areas.editionId, copy.id));
		const newBar = newAreas.find((a) => a.nameDe === 'Bar')!;
		const newTresen = newAreas.find((a) => a.nameDe === 'Tresen')!;
		expect(newTresen.parentId).toBe(newBar.id);
		expect(newBar.cancelDeadlineHours).toBe(12);

		const [shift] = await db.select().from(shifts).where(eq(shifts.editionId, copy.id));
		expect(shift.areaId).toBe(newTresen.id);
		// Still 10:00 local time, now in summer time (UTC+2).
		expect(shift.startsAt.toISOString()).toBe('2026-04-01T08:00:00.000Z');
		expect(shift.meetingPlaceId).not.toBe(place.id);
		expect(shift.meetingPlaceId).not.toBeNull();
		const [position] = await db
			.select()
			.from(shiftPositions)
			.where(eq(shiftPositions.shiftId, shift.id));
		expect([position.capacity, position.pointsPerShift]).toEqual([3, 2]);

		const [goodie] = await db.select().from(goodies).where(eq(goodies.editionId, copy.id));
		expect(goodie.requiredAreaIds).toEqual([newBar.id]);
		const [grant] = await db
			.select()
			.from(roleAssignments)
			.where(eq(roleAssignments.editionId, copy.id));
		expect(grant.areaId).toBe(newBar.id);
		const [wave] = await db.select().from(bookingWaves).where(eq(bookingWaves.editionId, copy.id));
		expect(wave.areaIds).toEqual([newTresen.id]);
		expect(wave.opensAt.toISOString()).toBe('2026-03-08T09:00:00.000Z');

		const [sourceAfter] = await db.select().from(editions).where(eq(editions.id, source.id));
		expect(sourceAfter.isCurrent).toBe(true);
	});
});
