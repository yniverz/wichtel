import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { Authz } from '#lib/domain/permissions.ts';
import type { Database } from '../db/client.ts';
import { emailOutbox, swapOffers, users } from '../db/schema.ts';
import { DomainError } from '../errors.ts';
import { createMemoryMailer } from '../mail.ts';
import { createTestDatabase } from '../testing/db.ts';
import { register } from './accounts.ts';
import { createArea } from './areas.ts';
import {
	acceptHold,
	bookPosition,
	cancelOwnAssignment,
	expireHolds,
	listUserAssignments,
	setAttendance
} from './assignments.ts';
import { createEdition } from './editions.ts';
import { bookForGroup, createGroup, getGroup, joinGroup, leaveGroup } from './groups.ts';
import { pointsBalance } from './points.ts';
import { invalidateSettingsCache, updateSettings } from './settings.ts';
import { createShift, getShift, type ShiftInput } from './shifts.ts';
import { answerProposal, createOffer, decideSwap, takeOffer } from './swaps.ts';
import { callUrgent } from './urgent.ts';

let database: Database;
const actor = { userId: null };
const lead = new Authz(true, [], () => []);
beforeEach(async () => {
	invalidateSettingsCache();
	database = await createTestDatabase();
});
afterEach(async () => {
	invalidateSettingsCache();
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
	const ctx = { db, mailer: createMemoryMailer(), baseUrl: 'http://test' };
	const person = async (email: string, firstName: string) => {
		const user = await register(ctx, {
			email,
			password: 'password 1234',
			firstName,
			lastName: 'Test',
			phone: '1',
			locale: 'de'
		});
		await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
		return { ...user, isAdmin: false };
	};
	const a = await person('a@x.org', 'Anna');
	const b = await person('b@x.org', 'Ben');
	const c = await person('c@x.org', 'Cem');
	const input = (start: string, end: string, capacity = 1, title = 'Bar'): ShiftInput => ({
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
		startsAt: new Date(start),
		endsAt: new Date(end),
		positions: [
			{
				nameDe: 'Theke',
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
	const ctxAt = (at = now) => ({ db, now: at });
	const statusOf = async (userId: string) =>
		(await listUserAssignments(db, userId, edition.id)).map((x) => x.status);
	return { db, edition, a, b, c, input, shiftOf, now, opts, ctxAt, statusOf };
}

describe('shift market', () => {
	it('hands a booking over to whoever takes it', async () => {
		const s = await seed();
		const shift = await s.shiftOf(s.input('2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z'));
		const booking = await bookPosition(s.ctxAt(), s.a.id, shift.positions[0].id, s.opts);
		const offer = await createOffer(s.ctxAt(), s.a.id, {
			assignmentId: booking.id,
			toEmail: null
		});
		await expectDomainError(
			createOffer(s.ctxAt(), s.a.id, { assignmentId: booking.id, toEmail: null }),
			'swapAlreadyOffered'
		);
		await expectDomainError(takeOffer(s.ctxAt(), s.a.id, offer.id, s.opts), 'notFound');

		// c has an overlapping shift and cannot take it.
		const other = await s.shiftOf(s.input('2027-06-12T12:00:00Z', '2027-06-12T16:00:00Z'));
		await bookPosition(s.ctxAt(), s.c.id, other.positions[0].id, s.opts);
		await expectDomainError(takeOffer(s.ctxAt(), s.c.id, offer.id, s.opts), 'overlap');

		expect(await takeOffer(s.ctxAt(), s.b.id, offer.id, s.opts)).toBe('completed');
		expect(await s.statusOf(s.a.id)).toEqual(['cancelled']);
		expect(await s.statusOf(s.b.id)).toEqual(['booked']);
		const mails = await s.db.select().from(emailOutbox).where(eq(emailOutbox.to, 'a@x.org'));
		expect(mails.map((m) => m.subject)).toContain('Übernommen: Bar');
	});

	it('needs a lead after the cancel deadline when configured', async () => {
		const s = await seed();
		await updateSettings(s.db, actor, { swapNeedsApproval: true });
		const shift = await s.shiftOf(s.input('2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z'));
		const booking = await bookPosition(s.ctxAt(), s.a.id, shift.positions[0].id, s.opts);
		const late = new Date('2027-06-11T10:00:00Z');
		const offer = await createOffer(s.ctxAt(late), s.a.id, {
			assignmentId: booking.id,
			toEmail: null
		});
		expect(await takeOffer(s.ctxAt(late), s.b.id, offer.id, s.opts)).toBe('pending_approval');
		expect(await s.statusOf(s.a.id)).toEqual(['booked']);
		await decideSwap(s.ctxAt(late), actor, lead, offer.id, true);
		expect(await s.statusOf(s.a.id)).toEqual(['cancelled']);
		expect(await s.statusOf(s.b.id)).toEqual(['booked']);
	});

	it('ends the offer when the booking is cancelled', async () => {
		const s = await seed();
		const shift = await s.shiftOf(s.input('2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z'));
		const booking = await bookPosition(s.ctxAt(), s.a.id, shift.positions[0].id, s.opts);
		const offer = await createOffer(s.ctxAt(), s.a.id, {
			assignmentId: booking.id,
			toEmail: null
		});
		await cancelOwnAssignment(s.ctxAt(), s.a.id, booking.id);
		const [row] = await s.db.select().from(swapOffers).where(eq(swapOffers.id, offer.id));
		expect(row.status).toBe('withdrawn');
		await expectDomainError(takeOffer(s.ctxAt(), s.b.id, offer.id, s.opts), 'notFound');
	});
});

describe('direct swap', () => {
	it('exchanges two bookings once both agree', async () => {
		const s = await seed();
		const x = await s.shiftOf(s.input('2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z', 1, 'X'));
		const y = await s.shiftOf(s.input('2027-06-13T10:00:00Z', '2027-06-13T14:00:00Z', 1, 'Y'));
		const ax = await bookPosition(s.ctxAt(), s.a.id, x.positions[0].id, s.opts);
		const by = await bookPosition(s.ctxAt(), s.b.id, y.positions[0].id, s.opts);
		await expectDomainError(
			createOffer(s.ctxAt(), s.a.id, { assignmentId: ax.id, toEmail: 'nobody@x.org' }),
			'swapUnknownPerson'
		);
		const offer = await createOffer(s.ctxAt(), s.a.id, {
			assignmentId: ax.id,
			toEmail: 'B@X.org'
		});
		// Only the addressed person can react.
		await expectDomainError(takeOffer(s.ctxAt(), s.c.id, offer.id, s.opts), 'notFound');
		expect(
			await takeOffer(s.ctxAt(), s.b.id, offer.id, { ...s.opts, counterAssignmentId: by.id })
		).toBe('proposed');
		expect(await answerProposal(s.ctxAt(), s.a.id, offer.id, true)).toBe('completed');

		const shiftsOf = async (userId: string) =>
			(await listUserAssignments(s.db, userId, s.edition.id))
				.filter((r) => r.status === 'booked')
				.map((r) => r.shiftId);
		expect(await shiftsOf(s.a.id)).toEqual([y.id]);
		expect(await shiftsOf(s.b.id)).toEqual([x.id]);
	});
});

describe('buddy groups', () => {
	it('reserves places for members who then accept or let them expire', async () => {
		const s = await seed();
		const group = await createGroup(s.db, s.a.id, s.edition.id, 'Crew Süd');
		await joinGroup(s.db, s.b.id, s.edition.id, group.inviteCode.toLowerCase());
		await joinGroup(s.db, s.c.id, s.edition.id, group.inviteCode);
		await expectDomainError(
			createGroup(s.db, s.b.id, s.edition.id, 'Zweite'),
			'groupAlreadyMember'
		);
		expect((await getGroup(s.db, s.a.id, s.edition.id))?.members).toHaveLength(3);

		const small = await s.shiftOf(s.input('2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z', 2));
		await expectDomainError(
			bookForGroup(s.ctxAt(), s.a, small.positions[0].id, [s.b.id, s.c.id], s.opts),
			'groupNotEnoughPlaces'
		);

		const shift = await s.shiftOf(s.input('2027-06-14T10:00:00Z', '2027-06-14T14:00:00Z', 3));
		const result = await bookForGroup(
			s.ctxAt(),
			s.a,
			shift.positions[0].id,
			[s.b.id, s.c.id],
			s.opts
		);
		expect(result).toEqual({ ok: true, reserved: 2 });
		expect(await s.statusOf(s.a.id)).toEqual(['booked']);
		expect((await getShift(s.db, shift.id))!.positions[0].booked).toBe(3);

		const [bHold] = await listUserAssignments(s.db, s.b.id, s.edition.id);
		await acceptHold(s.ctxAt(), s.b.id, bHold.id);
		expect(await s.statusOf(s.b.id)).toEqual(['booked']);

		// c lets the reservation run out (24 h by default).
		await expireHolds(s.db, new Date('2027-06-02T11:00:00Z'));
		expect(await s.statusOf(s.c.id)).toEqual(['cancelled']);

		await leaveGroup(s.db, s.c.id, s.edition.id);
		expect((await getGroup(s.db, s.a.id, s.edition.id))?.members).toHaveLength(2);
	});

	it('books nobody when a member cannot take the place', async () => {
		const s = await seed();
		const group = await createGroup(s.db, s.a.id, s.edition.id, 'Duo');
		await joinGroup(s.db, s.b.id, s.edition.id, group.inviteCode);
		const busy = await s.shiftOf(s.input('2027-06-12T09:00:00Z', '2027-06-12T11:00:00Z'));
		await bookPosition(s.ctxAt(), s.b.id, busy.positions[0].id, s.opts);
		const shift = await s.shiftOf(s.input('2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z', 2));
		const result = await bookForGroup(s.ctxAt(), s.a, shift.positions[0].id, [s.b.id], s.opts);
		expect(result).toEqual({ ok: false, problems: [{ name: 'Ben', problem: 'overlap' }] });
		expect(await s.statusOf(s.a.id)).toEqual([]);
	});
});

describe('urgent call', () => {
	it('mails people who could step in and pays the bonus', async () => {
		const s = await seed();
		const shift = await s.shiftOf(s.input('2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z', 2));
		const pos = shift.positions[0].id;
		await bookPosition(s.ctxAt(), s.a.id, pos, s.opts);
		const other = await s.shiftOf(s.input('2027-06-12T12:00:00Z', '2027-06-12T16:00:00Z'));
		await bookPosition(s.ctxAt(), s.c.id, other.positions[0].id, s.opts);
		await s.db.delete(emailOutbox);

		const reached = await callUrgent(s.db, actor, lead, pos, { bonus: 2, note: '' }, s.now);
		expect(reached).toBe(1); // only b: a is on the shift, c is busy
		const [mail] = await s.db.select().from(emailOutbox);
		expect(mail.to).toBe('b@x.org');
		await expectDomainError(
			callUrgent(s.db, actor, lead, pos, { bonus: 2, note: '' }, s.now),
			'urgentTooSoon'
		);

		const booking = await bookPosition(s.ctxAt(), s.b.id, pos, s.opts);
		expect(booking.bonusPoints).toBe(2);
		const day = new Date('2027-06-12T09:00:00Z');
		await setAttendance(s.ctxAt(day), actor, lead, booking.id, 'attended', 'Europe/Berlin');
		// 1 point per shift + 2 bonus
		expect(await pointsBalance(s.db, s.b.id, s.edition.id)).toBe(3);
	});
});
