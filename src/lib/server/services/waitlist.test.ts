import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { Authz } from '#lib/domain/permissions.ts';
import type { Database } from '../db/client.ts';
import { emailOutbox } from '../db/schema.ts';
import { DomainError } from '../errors.ts';
import { createTestDatabase } from '../testing/db.ts';
import { register } from './accounts.ts';
import { createArea } from './areas.ts';
import {
	bookPosition,
	cancelOwnAssignment,
	joinWaitlist,
	leadRemove,
	listUserAssignments
} from './assignments.ts';
import { createEdition } from './editions.ts';
import { createShift, getShift, updateShift, type ShiftInput } from './shifts.ts';
import { bookingAccess, createWave, redeemInvite } from './waves.ts';

let database: Database;
const actor = { userId: null };
beforeEach(async () => {
	database = await createTestDatabase();
});
afterEach(async () => {
	await database.close();
});

async function expectDomainError(promise: Promise<unknown>, code: string) {
	await expect(promise).rejects.toSatisfy((e) => e instanceof DomainError && e.code === code);
}

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
	const ctx = { db, baseUrl: 'http://test' };
	const person = (email: string) =>
		register(ctx, {
			email,
			password: 'password 1234',
			firstName: 'X',
			lastName: 'Y',
			phone: '1',
			locale: 'de'
		});
	const [a, b, c] = [await person('a@x.org'), await person('b@x.org'), await person('c@x.org')];
	const input = (start: string, end: string, capacity = 1): ShiftInput => ({
		areaId: area.id,
		titleDe: 'Bar',
		titleEn: '',
		descriptionDe: '',
		descriptionEn: '',
		location: '',
		meetingPoint: '',
		contact: '',
		visibility: 'public',
		cancelDeadlineHours: null,
		startsAt: new Date(start),
		endsAt: new Date(end),
		positions: [
			{
				nameDe: 'H',
				nameEn: '',
				descriptionDe: '',
				descriptionEn: '',
				capacity,
				bookingMode: 'open'
			}
		]
	});
	const shiftOf = async (i: ShiftInput) =>
		(await getShift(db, (await createShift(db, actor, edition.id, i)).id))!;
	const now = new Date('2027-06-01T10:00:00Z');
	const opts = { editionId: edition.id, canSee: () => true };
	return { db, edition, area, a, b, c, input, shiftOf, now, opts };
}

const statusOf = async (db: Database['db'], userId: string, editionId: string) =>
	(await listUserAssignments(db, userId, editionId)).map((x) => x.status);

describe('waiting list', () => {
	it('lets people move up when a place frees, skipping overlaps', async () => {
		const s = await seed();
		const input = s.input('2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z');
		const shift = await s.shiftOf(input);
		const pos = shift.positions[0].id;
		const ctx = { db: s.db, now: s.now };
		const first = await bookPosition(ctx, s.a.id, pos, s.opts);
		await expectDomainError(joinWaitlist(ctx, s.a.id, pos, s.opts), 'alreadyBooked');
		await joinWaitlist(ctx, s.b.id, pos, s.opts);
		await joinWaitlist(ctx, s.c.id, pos, s.opts);

		// b meanwhile takes an overlapping shift and must be skipped.
		const other = await s.shiftOf(s.input('2027-06-12T12:00:00Z', '2027-06-12T16:00:00Z'));
		await bookPosition(ctx, s.b.id, other.positions[0].id, s.opts);

		await s.db.delete(emailOutbox);
		await cancelOwnAssignment(ctx, s.a.id, first.id);
		expect(await statusOf(s.db, s.c.id, s.edition.id)).toEqual(['booked']);
		expect(await statusOf(s.db, s.b.id, s.edition.id)).toEqual(['waitlisted', 'booked']);
		const mails = await s.db.select().from(emailOutbox).where(eq(emailOutbox.to, 'c@x.org'));
		expect(mails[0].subject).toBe('Nachgerückt: Bar');

		// More capacity → b would move up, but still overlaps; a new person (a) waits and moves up.
		await joinWaitlist(ctx, s.a.id, pos, s.opts);
		await updateShift(s.db, actor, shift.id, {
			...input,
			positions: [{ ...input.positions[0], id: pos, capacity: 2 }]
		});
		expect((await statusOf(s.db, s.a.id, s.edition.id)).at(-1)).toBe('booked');

		// Leads removing someone also lets the list move up.
		const lead = new Authz(true, [], () => []);
		const [cAssignment] = await listUserAssignments(s.db, s.c.id, s.edition.id);
		await leadRemove(ctx, actor, lead, cAssignment.id);
	});

	it('cannot be joined while places are free', async () => {
		const s = await seed();
		const shift = await s.shiftOf(s.input('2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z', 2));
		await expectDomainError(
			joinWaitlist({ db: s.db, now: s.now }, s.a.id, shift.positions[0].id, s.opts),
			'positionNotFull'
		);
	});
});

describe('booking waves', () => {
	it('blocks booking outside waves and lets invited people in', async () => {
		const s = await seed();
		const shift = await s.shiftOf(s.input('2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z', 3));
		const wave = await createWave(s.db, actor, s.edition.id, {
			name: 'Freunde',
			opensAt: new Date('2027-05-01T00:00:00Z'),
			closesAt: null,
			areaIds: [],
			audience: 'invite'
		});
		const optsFor = async (user: { id: string; isAdmin: boolean }) => {
			const access = await bookingAccess(s.db, user, s.edition.id, s.now);
			return { ...s.opts, isOpen: (sh: { areaId: string }) => access(sh.areaId).open };
		};
		await expectDomainError(
			bookPosition({ db: s.db, now: s.now }, s.a.id, shift.positions[0].id, await optsFor(s.a)),
			'bookingClosed'
		);
		expect(await redeemInvite(s.db, s.a.id, 'wrong')).toBeNull();
		await redeemInvite(s.db, s.a.id, wave.inviteCode);
		await bookPosition({ db: s.db, now: s.now }, s.a.id, shift.positions[0].id, await optsFor(s.a));
	});
});
