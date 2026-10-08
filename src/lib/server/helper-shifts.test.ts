import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { Authz } from '#lib/domain/permissions.ts';
import type { Database } from './db/client.ts';
import { users } from './db/schema.ts';
import { createTestDatabase } from './testing/db.ts';
import { register } from './services/accounts.ts';
import { createArea } from './services/areas.ts';
import { bookPosition } from './services/assignments.ts';
import { createEdition } from './services/editions.ts';
import { invalidateSettingsCache } from './services/settings.ts';
import { createShift, getShift, type ShiftInput } from './services/shifts.ts';
import { createOffer } from './services/swaps.ts';
import { callUrgent } from './services/urgent.ts';
import { helperShiftsView, type HelperShift, type ShiftFacts } from './helper-shifts.ts';

let database: Database;
beforeEach(async () => {
	invalidateSettingsCache();
	database = await createTestDatabase();
});
afterEach(async () => {
	invalidateSettingsCache();
	await database.close();
});

const NOW = new Date('2027-06-10T12:00:00Z');
const admin = new Authz(true, [], () => []);
const nobody = (id: string) => [id];

async function seed() {
	const db = database.db;
	const actor = { userId: null };
	const edition = await createEdition(db, actor, {
		name: 'Fest',
		startsOn: '2027-06-01',
		endsOn: '2027-06-30'
	});
	const area = (nameDe: string, parentId: string | null = null) =>
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
	const bar = await area('Bar');
	const tent = await area('Zelt', bar.id);
	const security = await area('Sicherheit');
	const person = async (email: string) => {
		const user = await register(
			{ db, baseUrl: 'http://test' },
			{ email, password: 'password 1234', firstName: 'X', lastName: 'Y', phone: '1', locale: 'de' }
		);
		await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
		return { ...user, isAdmin: false };
	};
	const anna = await person('a@x.org');
	const ben = await person('b@x.org');
	const cem = await person('c@x.org');
	const shift = async (
		areaId: string,
		title: string,
		start: string,
		capacity = 2,
		visibility: 'public' | 'internal' = 'public'
	) => {
		const input: ShiftInput = {
			areaId,
			titleDe: title,
			titleEn: '',
			descriptionDe: '',
			descriptionEn: '',
			location: '',
			meetingPoint: '',
			contact: '',
			visibility,
			cancelDeadlineHours: null,
			startsAt: new Date(start),
			endsAt: new Date(new Date(start).getTime() + 3 * 3600_000),
			positions: [
				{
					nameDe: 'Team',
					nameEn: '',
					descriptionDe: '',
					descriptionEn: '',
					capacity,
					bookingMode: 'open'
				}
			]
		};
		return (await getShift(db, (await createShift(db, actor, edition.id, input)).id))!;
	};
	// Created before NOW (bookings check the real clock), viewed at NOW.
	const past = await shift(tent.id, 'Vorbei', '2027-06-09T10:00:00Z');
	const full = await shift(tent.id, 'Voll', '2027-06-11T10:00:00Z', 1);
	const urgent = await shift(bar.id, 'Dringend', '2027-06-11T16:00:00Z');
	const market = await shift(bar.id, 'Markt', '2027-06-12T10:00:00Z', 2);
	const internal = await shift(security.id, 'Intern', '2027-06-12T18:00:00Z', 2, 'internal');
	const opts = { editionId: edition.id, canSee: () => true };
	const ctx = { db, now: new Date() };
	// An urgent call whose place has been taken since: no longer urgent.
	await callUrgent(db, actor, admin, full.positions[0].id, { bonus: 1, note: '' }, new Date());
	await bookPosition(ctx, ben.id, full.positions[0].id, opts);
	const benMarket = await bookPosition(ctx, ben.id, market.positions[0].id, opts);
	await createOffer(ctx, ben.id, { assignmentId: benMarket.id, toEmail: null });
	await bookPosition(ctx, anna.id, urgent.positions[0].id, opts);
	await bookPosition(ctx, anna.id, market.positions[0].id, opts);
	await callUrgent(db, actor, admin, urgent.positions[0].id, { bonus: 2, note: '' }, new Date());
	return { db, edition, anna, ben, cem, bar, security, past, full, urgent, market, internal };
}

/** The facts must say the same as the fully built shift. */
function expectConsistent(facts: ShiftFacts, built: HelperShift) {
	expect(facts.day).toBe(built.day);
	expect(facts.past).toBe(built.past);
	expect(facts.mine).toBe(built.mine !== null);
	expect(facts.open).toBe(!built.past && built.positions.some((p) => p.free > 0));
	expect(facts.onMarket).toBe(
		!built.past && !built.mine && built.positions.some((p) => p.marketOfferId)
	);
	expect(facts.urgent).toBe(!built.past && built.positions.some((p) => p.urgent));
	expect(facts.bookingOpen).toBe(built.bookingOpen);
	expect(facts.bookingOpensAt?.toISOString() ?? null).toBe(built.bookingOpensAt);
	expect(facts.rootArea?.id).toBe(built.areaRootId);
}

describe('helperShiftsView', () => {
	it('summarises each shift exactly as the built view shows it', async () => {
		const s = await seed();
		for (const user of [s.anna, s.ben, s.cem]) {
			const view = await helperShiftsView(
				s.db,
				user,
				new Authz(false, [], nobody),
				s.edition.id,
				NOW
			);
			for (const shift of view.shifts) expectConsistent(view.facts(shift), view.build(shift));
		}
	});

	it('gives the facts the filters rely on', async () => {
		const s = await seed();
		const factsFor = async (user: { id: string; isAdmin: boolean }, shiftId: string) => {
			const view = await helperShiftsView(
				s.db,
				user,
				new Authz(false, [], nobody),
				s.edition.id,
				NOW
			);
			return view.facts(view.shifts.find((x) => x.id === shiftId)!);
		};
		expect(await factsFor(s.anna, s.past.id)).toMatchObject({
			past: true,
			open: false,
			day: '2027-06-09'
		});
		expect(await factsFor(s.anna, s.full.id)).toMatchObject({
			open: false,
			mine: false,
			urgent: false
		});
		expect((await factsFor(s.anna, s.full.id)).rootArea).toMatchObject({ id: s.bar.id });
		expect(await factsFor(s.anna, s.urgent.id)).toMatchObject({
			urgent: true,
			mine: true,
			open: true
		});
		// Ben offers his place on the market: Cem sees it there, Ben (offering) and Anna (booked on
		// the same shift) do not.
		expect(await factsFor(s.cem, s.market.id)).toMatchObject({ onMarket: true, open: false });
		expect((await factsFor(s.ben, s.market.id)).onMarket).toBe(false);
		expect(await factsFor(s.anna, s.market.id)).toMatchObject({ onMarket: false, mine: true });
	});

	it('shows internal shifts only to people with a role covering the area', async () => {
		const s = await seed();
		const helper = await helperShiftsView(
			s.db,
			s.anna,
			new Authz(false, [], nobody),
			s.edition.id,
			NOW
		);
		expect(helper.shifts.map((x) => x.id)).not.toContain(s.internal.id);
		const crew = new Authz(false, [{ areaId: s.security.id, permissions: [] }], nobody);
		const lead = await helperShiftsView(s.db, s.anna, crew, s.edition.id, NOW);
		expect(lead.shifts.map((x) => x.id)).toContain(s.internal.id);
	});
});
