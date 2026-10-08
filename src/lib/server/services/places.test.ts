import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../db/client.ts';
import { emailOutbox } from '../db/schema.ts';
import { DomainError } from '../errors.ts';
import { createMemoryMailer } from '../mail.ts';
import { createTestDatabase } from '../testing/db.ts';
import { register } from './accounts.ts';
import { createArea } from './areas.ts';
import { bookPosition } from './assignments.ts';
import { createEdition } from './editions.ts';
import { createPlace, deletePlace, setDeskPlace } from './places.ts';
import { createShift, getShift, type ShiftInput } from './shifts.ts';

let database: Database;
const actor = { userId: null };
beforeEach(async () => {
	database = await createTestDatabase();
});
afterEach(async () => {
	await database.close();
});

const place = (
	nameDe: string,
	extra: Partial<{ address: string; lat: number; lng: number }> = {}
) => ({
	nameDe,
	nameEn: '',
	descriptionDe: '',
	descriptionEn: '',
	address: extra.address ?? '',
	lat: extra.lat ?? null,
	lng: extra.lng ?? null,
	planX: 0.5,
	planY: 0.25,
	sortOrder: 0
});

describe('places', () => {
	it('links shifts to places and mentions them in e-mails', async () => {
		const db = database.db;
		const edition = await createEdition(db, actor, {
			name: 'Fest',
			startsOn: '2027-06-01',
			endsOn: '2027-06-30'
		});
		const other = await createEdition(db, actor, {
			name: 'Alt',
			startsOn: '2026-06-01',
			endsOn: '2026-06-30'
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
		const gate = await createPlace(
			db,
			actor,
			edition.id,
			place('Tor 3', { address: 'Mensaweg 1', lat: 49.87, lng: 8.65 })
		);
		const foreign = await createPlace(db, actor, other.id, place('Fremd'));
		const input: ShiftInput = {
			areaId: area.id,
			titleDe: 'Bar',
			titleEn: '',
			descriptionDe: '',
			descriptionEn: '',
			location: '',
			meetingPoint: 'beim Container',
			contact: '',
			visibility: 'public',
			cancelDeadlineHours: null,
			meetingPlaceId: gate.id,
			startsAt: new Date('2027-06-12T10:00:00Z'),
			endsAt: new Date('2027-06-12T14:00:00Z'),
			positions: [
				{
					nameDe: 'H',
					nameEn: '',
					descriptionDe: '',
					descriptionEn: '',
					capacity: 2,
					bookingMode: 'open'
				}
			]
		};
		await expect(
			createShift(db, actor, edition.id, { ...input, meetingPlaceId: foreign.id })
		).rejects.toBeInstanceOf(DomainError);
		const shift = (await getShift(db, (await createShift(db, actor, edition.id, input)).id))!;

		const kim = await register(
			{ db, mailer: createMemoryMailer(), baseUrl: 'http://test' },
			{
				email: 'kim@x.org',
				password: 'password 1234',
				firstName: 'Kim',
				lastName: 'M',
				phone: '1',
				locale: 'de'
			}
		);
		await db.delete(emailOutbox);
		await bookPosition(
			{ db, now: new Date('2027-06-01T00:00:00Z') },
			kim.id,
			shift.positions[0].id,
			{
				editionId: edition.id,
				canSee: () => true
			}
		);
		const [mail] = await db.select().from(emailOutbox);
		expect(mail.text).toContain('Treffpunkt: Tor 3 (Mensaweg 1) – beim Container');
		expect(mail.text).toContain('https://www.google.com/maps/search/?api=1&query=49.87,8.65');

		await expect(setDeskPlace(db, actor, edition.id, foreign.id)).rejects.toBeInstanceOf(
			DomainError
		);
		await setDeskPlace(db, actor, edition.id, gate.id);
		await deletePlace(db, actor, edition.id, gate.id);
		expect((await getShift(db, shift.id))?.meetingPlaceId).toBeNull();
	});
});
