import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isNull } from 'drizzle-orm';
import { Authz } from '#lib/domain/permissions.ts';
import type { Database } from './db/client.ts';
import { emailOutbox, mailTemplates } from './db/schema.ts';
import { buildCalendar } from './ical.ts';
import { createMemoryMailer, type Mailer } from './mail.ts';
import { processOutbox, queueReminders } from './outbox.ts';
import { createTestDatabase } from './testing/db.ts';
import { register } from './services/accounts.ts';
import { createArea } from './services/areas.ts';
import { bookPosition, decideRequest } from './services/assignments.ts';
import { createEdition } from './services/editions.ts';
import { createShift, deleteShift, getShift, updateShift } from './services/shifts.ts';

let database: Database;
const actor = { userId: null };

beforeEach(async () => {
	database = await createTestDatabase();
});
afterEach(async () => {
	await database.close();
});

async function seed(bookingMode: 'open' | 'request' = 'open') {
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
	const kim = await register(
		{ db, mailer: createMemoryMailer(), baseUrl: 'http://test' },
		{
			email: 'kim@example.org',
			password: 'password 1234',
			firstName: 'Kim',
			lastName: 'M',
			phone: '1',
			locale: 'de'
		}
	);
	const input = {
		areaId: area.id,
		titleDe: 'Bar',
		titleEn: 'Bar',
		descriptionDe: '',
		descriptionEn: '',
		location: 'Zelt 2',
		meetingPoint: '',
		contact: '',
		visibility: 'public' as const,
		cancelDeadlineHours: null,
		startsAt: new Date('2027-06-12T16:00:00Z'),
		endsAt: new Date('2027-06-12T20:00:00Z'),
		positions: [
			{
				nameDe: 'Helfer*in',
				nameEn: '',
				descriptionDe: '',
				descriptionEn: '',
				capacity: 2,
				bookingMode
			}
		]
	};
	const shift = (await getShift(db, (await createShift(db, actor, edition.id, input)).id))!;
	const book = () =>
		bookPosition({ db, now: new Date('2027-06-01T10:00:00Z') }, kim.id, shift.positions[0].id, {
			editionId: edition.id,
			canSee: () => true
		});
	return { db, edition, kim, shift, input, book };
}

const outbox = () => database.db.select().from(emailOutbox);

describe('notifications', () => {
	it('confirms bookings in the person’s language with shift details', async () => {
		const s = await seed();
		await s.book();
		const [mail] = await outbox();
		expect(mail.to).toBe('kim@example.org');
		expect(mail.subject).toBe('Du bist eingetragen: Bar');
		expect(mail.text).toContain('Samstag, 12. Juni, 18:00–22:00');
		expect(mail.text).toContain('Ort: Zelt 2');
		expect(mail.html).toContain('<p>Hallo Kim,</p>');
	});

	it('uses admin overrides of templates', async () => {
		const s = await seed();
		await s.db.insert(mailTemplates).values({
			key: 'booking_confirmed',
			locale: 'de',
			subject: 'Danke {name}!',
			body: 'Bis {date} bei {shift}.'
		});
		await s.book();
		const [mail] = await outbox();
		expect(mail.subject).toBe('Danke Kim!');
		expect(mail.text).toBe('Bis Samstag, 12. Juni bei Bar.');
	});

	it('informs about requests, changes and cancellations', async () => {
		const s = await seed('request');
		const a = await s.book();
		const lead = new Authz(true, [], () => []);
		await decideRequest({ db: s.db, now: new Date() }, actor, lead, a.id, true);
		await updateShift(s.db, actor, s.shift.id, {
			...s.input,
			location: 'Zelt 3',
			positions: [{ ...s.input.positions[0], id: s.shift.positions[0].id }]
		});
		await updateShift(s.db, actor, s.shift.id, {
			...s.input,
			location: 'Zelt 3',
			titleDe: 'Bar Nord',
			positions: [{ ...s.input.positions[0], id: s.shift.positions[0].id }]
		}); // title only: no mail
		await deleteShift(s.db, actor, s.shift.id);
		const subjects = (await outbox()).map((m) => m.subject);
		expect(subjects).toEqual([
			'Anfrage gesendet: Bar',
			'Bestätigt: Bar',
			'Geändert: Bar',
			'Abgesagt: Bar Nord'
		]);
	});
});

describe('outbox', () => {
	it('sends queued mails and retries failures', async () => {
		const s = await seed();
		await s.book();
		let fail = true;
		const memory = createMemoryMailer();
		const flaky: Mailer = {
			async send(m) {
				if (fail) throw new Error('SMTP down');
				await memory.send(m);
			}
		};
		const now = new Date('2027-06-01T10:00:00Z');
		expect(await processOutbox(s.db, flaky, now)).toBe(0);
		const [failed] = await outbox();
		expect(failed.attempts).toBe(1);
		expect(failed.lastError).toBe('SMTP down');
		// Not retried before the back-off has passed …
		fail = false;
		expect(await processOutbox(s.db, flaky, now)).toBe(0);
		// … but afterwards.
		expect(await processOutbox(s.db, flaky, new Date(now.getTime() + 2 * 60_000))).toBe(1);
		expect(memory.sent).toHaveLength(1);
		expect(await s.db.select().from(emailOutbox).where(isNull(emailOutbox.sentAt))).toHaveLength(0);
	});

	it('queues each reminder once', async () => {
		const s = await seed();
		await s.book();
		await s.db.delete(emailOutbox);
		expect(await queueReminders(s.db, new Date('2027-06-10T10:00:00Z'))).toBe(0); // too early
		const dayBefore = new Date('2027-06-11T18:00:00Z');
		expect(await queueReminders(s.db, dayBefore)).toBe(1);
		expect(await queueReminders(s.db, dayBefore)).toBe(0);
		const [mail] = await outbox();
		expect(mail.subject).toBe('Erinnerung: Bar, Samstag, 12. Juni');
	});
});

describe('ical', () => {
	it('builds a valid, escaped and folded calendar', () => {
		const ics = buildCalendar('Fest', [
			{
				uid: 'a@wichtel',
				start: new Date('2027-06-12T16:00:00Z'),
				end: new Date('2027-06-12T20:00:00Z'),
				updated: new Date('2027-06-01T00:00:00Z'),
				summary: 'Bar; Nord, Zelt',
				description: 'x'.repeat(200)
			}
		]);
		expect(ics).toContain('DTSTART:20270612T160000Z');
		expect(ics).toContain('SUMMARY:Bar\\; Nord\\, Zelt');
		expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
			true
		);
		expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
	});
});
