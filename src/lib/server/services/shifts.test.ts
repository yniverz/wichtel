import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Authz } from '#lib/domain/permissions.ts';
import type { Database } from '../db/client.ts';
import { DomainError } from '../errors.ts';
import { createMemoryMailer } from '../mail.ts';
import { createTestDatabase } from '../testing/db.ts';
import { register } from './accounts.ts';
import { createArea } from './areas.ts';
import {
	bookPosition,
	cancelOwnAssignment,
	decideRequest,
	leadAssign,
	leadRemove,
	listUserAssignments,
	setAttendance
} from './assignments.ts';
import { createEdition } from './editions.ts';
import { updateSettings } from './settings.ts';
import {
	createSeries,
	createShift,
	deleteShift,
	getShift,
	updateShift,
	type ShiftInput
} from './shifts.ts';

const TZ = 'Europe/Berlin';
let database: Database;

beforeEach(async () => {
	database = await createTestDatabase();
});
afterEach(async () => {
	await database.close();
});

const actor = { userId: null };
const position = (capacity: number, bookingMode: 'open' | 'request' = 'open') => ({
	nameDe: 'Helfer*in',
	nameEn: '',
	descriptionDe: '',
	descriptionEn: '',
	capacity,
	bookingMode
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
		cancelDeadlineHours: null
	});
	const ctx = { db, mailer: createMemoryMailer(), baseUrl: 'http://test' };
	const person = (email: string) =>
		register(ctx, {
			email,
			password: 'password 1234',
			firstName: 'A',
			lastName: 'B',
			phone: '1',
			locale: 'de'
		});
	const kim = await person('kim@example.org');
	const lou = await person('lou@example.org');
	const lead = await person('lead@example.org');

	const shiftInput = (start: string, end: string, positions = [position(2)]): ShiftInput => ({
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
		positions
	});
	const leadAuthz = new Authz(
		false,
		[{ areaId: area.id, permissions: ['assignment.manage', 'attendance.confirm'] }],
		(id) => [id]
	);
	const overrideAuthz = new Authz(
		false,
		[{ areaId: area.id, permissions: ['assignment.manage', 'assignment.override'] }],
		(id) => [id]
	);
	return { db, edition, area, kim, lou, lead, shiftInput, leadAuthz, overrideAuthz };
}

const now = new Date('2027-06-01T10:00:00Z');
const visible = () => true;

describe('booking', () => {
	it('books, blocks overlaps, full positions and duplicates', async () => {
		const s = await seed();
		const evening = await createShift(
			s.db,
			actor,
			s.edition.id,
			s.shiftInput('2027-06-12T16:00:00Z', '2027-06-12T20:00:00Z', [position(1)])
		);
		const late = await createShift(
			s.db,
			actor,
			s.edition.id,
			s.shiftInput('2027-06-12T19:00:00Z', '2027-06-12T23:00:00Z')
		);
		const ev = (await getShift(s.db, evening.id))!;
		const lt = (await getShift(s.db, late.id))!;
		const ctx = { db: s.db, now };
		const opts = { editionId: s.edition.id, canSee: visible };

		const a = await bookPosition(ctx, s.kim.id, ev.positions[0].id, opts);
		expect(a.status).toBe('booked');
		await expectDomainError(bookPosition(ctx, s.kim.id, ev.positions[0].id, opts), 'alreadyBooked');
		await expectDomainError(bookPosition(ctx, s.lou.id, ev.positions[0].id, opts), 'positionFull');
		await expectDomainError(bookPosition(ctx, s.kim.id, lt.positions[0].id, opts), 'overlap');
		await expectDomainError(
			bookPosition(ctx, s.kim.id, ev.positions[0].id, {
				editionId: s.edition.id,
				canSee: () => false
			}),
			'notFound'
		);
		await expectDomainError(
			bookPosition(
				{ db: s.db, now: new Date('2027-06-12T19:30:00Z') },
				s.lou.id,
				lt.positions[0].id,
				opts
			),
			'shiftStarted'
		);
	});

	it('enforces the configured break between shifts', async () => {
		const s = await seed();
		await updateSettings(s.db, actor, { minBreakMinutes: 60 });
		const first = (await getShift(
			s.db,
			(
				await createShift(
					s.db,
					actor,
					s.edition.id,
					s.shiftInput('2027-06-12T10:00:00Z', '2027-06-12T12:00:00Z')
				)
			).id
		))!;
		const second = (await getShift(
			s.db,
			(
				await createShift(
					s.db,
					actor,
					s.edition.id,
					s.shiftInput('2027-06-12T12:30:00Z', '2027-06-12T14:00:00Z')
				)
			).id
		))!;
		const ctx = { db: s.db, now };
		const opts = { editionId: s.edition.id, canSee: visible };
		await bookPosition(ctx, s.kim.id, first.positions[0].id, opts);
		await expectDomainError(bookPosition(ctx, s.kim.id, second.positions[0].id, opts), 'overlap');
	});

	it('handles requests and lets leads decide', async () => {
		const s = await seed();
		const shift = (await getShift(
			s.db,
			(
				await createShift(
					s.db,
					actor,
					s.edition.id,
					s.shiftInput('2027-06-12T10:00:00Z', '2027-06-12T12:00:00Z', [position(1, 'request')])
				)
			).id
		))!;
		const ctx = { db: s.db, now };
		const opts = { editionId: s.edition.id, canSee: visible };
		const kimReq = await bookPosition(ctx, s.kim.id, shift.positions[0].id, opts);
		const louReq = await bookPosition(ctx, s.lou.id, shift.positions[0].id, opts);
		expect(kimReq.status).toBe('requested');

		await decideRequest(ctx, { userId: s.lead.id }, s.leadAuthz, kimReq.id, true);
		await expectDomainError(
			decideRequest(ctx, { userId: s.lead.id }, s.leadAuthz, louReq.id, true),
			'positionFull'
		);
		await decideRequest(ctx, { userId: s.lead.id }, s.leadAuthz, louReq.id, false);

		const kimList = await listUserAssignments(s.db, s.kim.id, s.edition.id);
		expect(kimList[0].status).toBe('booked');
		const nobody = new Authz(false, [], () => []);
		await expectDomainError(
			decideRequest(ctx, { userId: null }, nobody, kimReq.id, false),
			'forbidden'
		);
	});

	it('respects cancel deadlines from area and shift', async () => {
		const s = await seed();
		const input = s.shiftInput('2027-06-12T10:00:00Z', '2027-06-12T12:00:00Z');
		const shift = (await getShift(
			s.db,
			(await createShift(s.db, actor, s.edition.id, { ...input, cancelDeadlineHours: 24 })).id
		))!;
		const opts = { editionId: s.edition.id, canSee: visible };
		const a = await bookPosition({ db: s.db, now }, s.kim.id, shift.positions[0].id, opts);
		await expectDomainError(
			cancelOwnAssignment({ db: s.db, now: new Date('2027-06-11T11:00:00Z') }, s.kim.id, a.id),
			'cancelDeadlinePassed'
		);
		await expectDomainError(cancelOwnAssignment({ db: s.db, now }, s.lou.id, a.id), 'notFound');
		await cancelOwnAssignment({ db: s.db, now: new Date('2027-06-11T09:00:00Z') }, s.kim.id, a.id);
		// The place is free again.
		await bookPosition({ db: s.db, now }, s.kim.id, shift.positions[0].id, opts);
	});

	it('lets leads add people, reporting overridable issues', async () => {
		const s = await seed();
		const shift = (await getShift(
			s.db,
			(
				await createShift(
					s.db,
					actor,
					s.edition.id,
					s.shiftInput('2027-06-12T10:00:00Z', '2027-06-12T12:00:00Z', [position(1)])
				)
			).id
		))!;
		const ctx = { db: s.db, now };
		const pos = shift.positions[0].id;
		const first = await leadAssign(ctx, { userId: s.lead.id }, s.leadAuthz, {
			positionId: pos,
			userId: s.kim.id,
			override: false
		});
		expect(first.issues).toEqual([]);

		const full = await leadAssign(ctx, { userId: s.lead.id }, s.leadAuthz, {
			positionId: pos,
			userId: s.lou.id,
			override: false
		});
		expect(full.issues).toEqual(['full']);
		expect(full.assignment).toBeUndefined();
		await expectDomainError(
			leadAssign(ctx, { userId: s.lead.id }, s.leadAuthz, {
				positionId: pos,
				userId: s.lou.id,
				override: true
			}),
			'forbidden'
		);
		const forced = await leadAssign(ctx, { userId: s.lead.id }, s.overrideAuthz, {
			positionId: pos,
			userId: s.lou.id,
			override: true
		});
		expect(forced.assignment?.status).toBe('booked');

		await leadRemove(ctx, { userId: s.lead.id }, s.leadAuthz, forced.assignment!.id);
	});

	it('confirms attendance from the start of the shift day', async () => {
		const s = await seed();
		const shift = (await getShift(
			s.db,
			(
				await createShift(
					s.db,
					actor,
					s.edition.id,
					s.shiftInput('2027-06-12T16:00:00Z', '2027-06-12T20:00:00Z')
				)
			).id
		))!;
		const a = await bookPosition({ db: s.db, now }, s.kim.id, shift.positions[0].id, {
			editionId: s.edition.id,
			canSee: visible
		});
		await expectDomainError(
			setAttendance(
				{ db: s.db, now: new Date('2027-06-11T21:00:00Z') },
				{ userId: s.lead.id },
				s.leadAuthz,
				a.id,
				'attended',
				TZ
			),
			'checkInTooEarly'
		);
		await setAttendance(
			{ db: s.db, now: new Date('2027-06-12T08:00:00Z') },
			{ userId: s.lead.id },
			s.leadAuthz,
			a.id,
			'attended',
			TZ
		);
		expect((await listUserAssignments(s.db, s.kim.id, s.edition.id))[0].attendance).toBe(
			'attended'
		);
	});
});

describe('shift editing', () => {
	it('protects booked positions and capacities', async () => {
		const s = await seed();
		const created = await createShift(
			s.db,
			actor,
			s.edition.id,
			s.shiftInput('2027-06-12T10:00:00Z', '2027-06-12T12:00:00Z', [position(2)])
		);
		const shift = (await getShift(s.db, created.id))!;
		const pos = shift.positions[0];
		await bookPosition({ db: s.db, now }, s.kim.id, pos.id, {
			editionId: s.edition.id,
			canSee: visible
		});
		await bookPosition({ db: s.db, now }, s.lou.id, pos.id, {
			editionId: s.edition.id,
			canSee: visible
		});

		const base = s.shiftInput('2027-06-12T10:00:00Z', '2027-06-12T12:00:00Z');
		await expectDomainError(
			updateShift(s.db, actor, shift.id, { ...base, positions: [position(1)] }),
			'positionHasBookings'
		);
		await expectDomainError(
			updateShift(s.db, actor, shift.id, { ...base, positions: [{ ...position(1), id: pos.id }] }),
			'capacityBelowBooked'
		);
		await updateShift(s.db, actor, shift.id, {
			...base,
			titleDe: 'Bar Nord',
			positions: [{ ...position(3), id: pos.id }, position(1, 'request')]
		});
		const after = (await getShift(s.db, shift.id))!;
		expect(after.titleDe).toBe('Bar Nord');
		expect(after.positions.map((p) => [p.capacity, p.booked])).toEqual([
			[3, 2],
			[1, 0]
		]);

		const affected = await deleteShift(s.db, actor, shift.id);
		expect(affected.sort()).toEqual([s.kim.id, s.lou.id].sort());
	});

	it('creates series', async () => {
		const s = await seed();
		const {
			positions,
			startsAt: _s,
			endsAt: _e,
			...details
		} = s.shiftInput('2027-06-12T10:00:00Z', '2027-06-12T12:00:00Z');
		void _s;
		void _e;
		const count = await createSeries(s.db, actor, s.edition.id, details, positions, {
			from: '2027-06-10',
			to: '2027-06-13',
			weekdays: [0, 1, 2, 3, 4, 5, 6],
			slots: [
				{ start: '10:00', end: '14:00' },
				{ start: '14:00', end: '18:00' }
			],
			timeZone: TZ
		});
		expect(count).toBe(8);
		await expectDomainError(
			createSeries(s.db, actor, s.edition.id, details, positions, {
				from: '2027-06-10',
				to: '2027-06-13',
				weekdays: [],
				slots: [{ start: '10:00', end: '14:00' }],
				timeZone: TZ
			}),
			'seriesEmpty'
		);
	});
});
