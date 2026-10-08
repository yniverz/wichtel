import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { Authz } from '#lib/domain/permissions.ts';
import type { Database } from '../db/client.ts';
import { shifts, users } from '../db/schema.ts';
import { createTestDatabase } from '../testing/db.ts';
import { register } from './accounts.ts';
import { createArea } from './areas.ts';
import { bookPosition } from './assignments.ts';
import { createEdition } from './editions.ts';
import { createPlace, deletePlace } from './places.ts';
import { invalidateSettingsCache } from './settings.ts';
import {
	afterShiftChange,
	createShift,
	deleteShift,
	listShifts,
	updateShift,
	type ShiftInput
} from './shifts.ts';
import { callUrgent, endUrgent } from './urgent.ts';

let database: Database;
beforeEach(async () => {
	invalidateSettingsCache();
	database = await createTestDatabase();
});
afterEach(async () => {
	invalidateSettingsCache();
	await database.close();
	// Each test has a fresh database; start without shifts cached from the last one.
	await afterShiftChange(Promise.resolve());
});

const actor = { userId: null };
const admin = new Authz(true, [], () => []);

async function seed() {
	const db = database.db;
	const edition = await createEdition(db, actor, {
		name: 'Fest',
		startsOn: '2027-06-01',
		endsOn: '2027-06-30'
	});
	const area = await createArea(db, actor, edition.id, {
		parentId: null,
		nameDe: 'Bar',
		nameEn: '',
		descriptionDe: '',
		descriptionEn: '',
		sortOrder: 0,
		cancelDeadlineHours: null,
		pointsPerShift: null,
		pointsPerHour: null
	});
	const gate = await createPlace(db, actor, edition.id, {
		nameDe: 'Tor',
		nameEn: '',
		descriptionDe: '',
		descriptionEn: '',
		address: '',
		lat: null,
		lng: null,
		planX: 0.5,
		planY: 0.5,
		sortOrder: 0
	});
	const input = (title: string): ShiftInput => ({
		areaId: area.id,
		titleDe: title,
		titleEn: '',
		descriptionDe: '',
		descriptionEn: '',
		location: '',
		meetingPoint: '',
		contact: '',
		visibility: 'public',
		cancelDeadlineHours: null,
		locationPlaceId: gate.id,
		startsAt: new Date('2027-06-10T10:00:00Z'),
		endsAt: new Date('2027-06-10T14:00:00Z'),
		positions: [
			{
				nameDe: 'Team',
				nameEn: '',
				descriptionDe: '',
				descriptionEn: '',
				capacity: 2,
				bookingMode: 'open'
			}
		]
	});
	const user = await register(
		{ db, baseUrl: 'http://test' },
		{
			email: 'a@x.org',
			password: 'password 1234',
			firstName: 'A',
			lastName: 'B',
			phone: '1',
			locale: 'de'
		}
	);
	await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
	const cached = () => listShifts(db, edition.id, { cached: true });
	return { db, edition, gate, input, user, cached };
}

describe('cached shift list', () => {
	it('shows every change to shifts and positions right away', async () => {
		const s = await seed();
		expect(await s.cached()).toEqual([]);

		const shift = await createShift(s.db, actor, s.edition.id, s.input('Bar'));
		expect((await s.cached()).map((x) => x.titleDe)).toEqual(['Bar']);

		const position = (await s.cached())[0].positions[0];
		await updateShift(s.db, actor, shift.id, {
			...s.input('Theke'),
			positions: [{ ...s.input('Theke').positions[0], id: position.id, capacity: 5 }]
		});
		const updated = (await s.cached())[0];
		expect(updated.titleDe).toBe('Theke');
		expect(updated.positions[0].capacity).toBe(5);

		await callUrgent(s.db, actor, admin, position.id, { bonus: 2, note: 'Hilfe' }, new Date());
		expect((await s.cached())[0].positions[0].urgentNote).toBe('Hilfe');
		await endUrgent(s.db, actor, admin, position.id);
		expect((await s.cached())[0].positions[0].urgentAt).toBeNull();

		// Deleting a place unlinks it from shifts (foreign key), which the cache must notice.
		await deletePlace(s.db, actor, s.edition.id, s.gate.id);
		expect((await s.cached())[0].locationPlaceId).toBeNull();

		await deleteShift(s.db, actor, shift.id);
		expect(await s.cached()).toEqual([]);
	});

	it('always counts bookings fresh', async () => {
		const s = await seed();
		await createShift(s.db, actor, s.edition.id, s.input('Bar'));
		const position = (await s.cached())[0].positions[0];
		expect(position.booked).toBe(0);
		await bookPosition({ db: s.db, now: new Date() }, s.user.id, position.id, {
			editionId: s.edition.id,
			canSee: () => true
		});
		expect((await s.cached())[0].positions[0].booked).toBe(1);
	});

	it('is only used when asked for, so other readers see changes made outside the services', async () => {
		const s = await seed();
		await createShift(s.db, actor, s.edition.id, s.input('Bar'));
		await s.cached();
		await s.db.update(shifts).set({ titleDe: 'Direkt' });
		expect((await listShifts(s.db, s.edition.id))[0].titleDe).toBe('Direkt');
	});
});
