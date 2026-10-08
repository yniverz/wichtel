import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../db/client.ts';
import { emailOutbox } from '../db/schema.ts';
import { createTestDatabase } from '../testing/db.ts';
import { register } from './accounts.ts';
import { createArea } from './areas.ts';
import { bookPosition } from './assignments.ts';
import { createEdition } from './editions.ts';
import { recipients, sendBroadcast } from './broadcast.ts';
import { createShift, getShift } from './shifts.ts';

let database: Database;
const actor = { userId: null };
beforeEach(async () => {
	database = await createTestDatabase();
});
afterEach(async () => {
	await database.close();
});

describe('group emails', () => {
	it('reaches the people of an area subtree in their language', async () => {
		const db = database.db;
		const edition = await createEdition(db, actor, {
			name: 'Fest',
			startsOn: '2027-06-01',
			endsOn: '2027-06-30'
		});
		const area = (nameDe: string, parentId: string | null) =>
			createArea(db, actor, edition.id, {
				parentId,
				nameDe,
				nameEn: '',
				descriptionDe: '',
				descriptionEn: '',
				sortOrder: 0,
				cancelDeadlineHours: null,
				pointsPerShift: null,
				pointsPerHour: null
			});
		const infra = await area('Infrastruktur', null);
		const aufbau = await area('Aufbau', infra.id);
		const bar = await area('Bar', null);
		const ctx = { db, baseUrl: 'http://test' };
		const person = (email: string, locale: 'de' | 'en') =>
			register(ctx, {
				email,
				password: 'password 1234',
				firstName: email.split('@')[0],
				lastName: 'Y',
				phone: '1',
				locale
			});
		const kim = await person('kim@x.org', 'de');
		const sam = await person('sam@x.org', 'en');
		const lou = await person('lou@x.org', 'de');
		const shiftIn = async (areaId: string) => {
			const s = await createShift(db, actor, edition.id, {
				areaId,
				titleDe: 'S',
				titleEn: '',
				descriptionDe: '',
				descriptionEn: '',
				location: '',
				meetingPoint: '',
				contact: '',
				visibility: 'public',
				cancelDeadlineHours: null,
				startsAt: new Date('2027-06-12T10:00:00Z'),
				endsAt: new Date('2027-06-12T14:00:00Z'),
				positions: [
					{
						nameDe: 'H',
						nameEn: '',
						descriptionDe: '',
						descriptionEn: '',
						capacity: 5,
						bookingMode: 'open'
					}
				]
			});
			return (await getShift(db, s.id))!;
		};
		const book = async (userId: string, areaId: string) =>
			bookPosition(
				{ db, now: new Date('2027-06-01T00:00:00Z') },
				userId,
				(await shiftIn(areaId)).positions[0].id,
				{
					editionId: edition.id,
					canSee: () => true
				}
			);
		await book(kim.id, aufbau.id);
		await book(sam.id, aufbau.id);
		await book(lou.id, bar.id);

		const infraPeople = await recipients(db, edition.id, { kind: 'area', areaId: infra.id });
		expect(infraPeople.map((p) => p.email).sort()).toEqual(['kim@x.org', 'sam@x.org']);
		expect((await recipients(db, edition.id, { kind: 'helpers' })).length).toBe(3);

		await db.delete(emailOutbox);
		const count = await sendBroadcast(db, actor, {
			editionId: edition.id,
			audience: { kind: 'area', areaId: infra.id },
			subjectDe: 'Treffpunkt geändert',
			bodyDe: 'Hallo {name}, wir treffen uns am Tor 3.',
			subjectEn: 'Meeting point changed',
			bodyEn: 'Hi {name}, we meet at gate 3.'
		});
		expect(count).toBe(2);
		const mails = await db.select().from(emailOutbox);
		const byTo = Object.fromEntries(mails.map((m) => [m.to, m]));
		expect(byTo['kim@x.org'].text).toBe('Hallo kim, wir treffen uns am Tor 3.');
		expect(byTo['sam@x.org'].subject).toBe('Meeting point changed');
	});
});
