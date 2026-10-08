import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Authz } from '#lib/domain/permissions.ts';
import type { Database } from '../db/client.ts';
import { DomainError } from '../errors.ts';
import { createMemoryMailer } from '../mail.ts';
import { createTestDatabase } from '../testing/db.ts';
import { register } from './accounts.ts';
import { createArea } from './areas.ts';
import { bookPosition, leadRemove, setAttendance } from './assignments.ts';
import { createEdition } from './editions.ts';
import {
	cancelClaim,
	claimGoodie,
	createGoodie,
	goodieOverview,
	issueClaim,
	issueDirectly,
	markRefunded,
	requestRefund,
	type GoodieInput
} from './goodies.ts';
import { adjustPoints, pendingPoints, pointsBalance, pointsHistory } from './points.ts';
import { updateSettings } from './settings.ts';
import { createShift, getShift } from './shifts.ts';

const TZ = 'Europe/Berlin';
const actor = { userId: null };
let database: Database;

beforeEach(async () => {
	database = await createTestDatabase();
});
afterEach(async () => {
	await database.close();
});

async function expectDomainError(promise: Promise<unknown>, code: string) {
	await expect(promise).rejects.toSatisfy((e) => e instanceof DomainError && e.code === code);
}

const goodie = (input: Partial<GoodieInput>): GoodieInput => ({
	nameDe: 'Goodie',
	nameEn: '',
	descriptionDe: '',
	descriptionEn: '',
	price: 1,
	maxPerPerson: 1,
	selfServiceLimit: null,
	stock: null,
	variants: [],
	requiredAreaIds: [],
	mandatory: false,
	mandatoryPriority: 0,
	refundable: false,
	advance: false,
	active: true,
	sortOrder: 0,
	...input
});

async function seed() {
	const db = database.db;
	const edition = await createEdition(db, actor, {
		name: 'Fest',
		startsOn: '2027-06-01',
		endsOn: '2027-06-30'
	});
	const areaInput = (nameDe: string, pointsPerShift: number | null = null) => ({
		parentId: null,
		nameDe,
		nameEn: '',
		descriptionDe: '',
		descriptionEn: '',
		sortOrder: 0,
		cancelDeadlineHours: null,
		pointsPerShift,
		pointsPerHour: null
	});
	const bar = await createArea(db, actor, edition.id, areaInput('Bar'));
	const abbau = await createArea(db, actor, edition.id, areaInput('Abbau', 3));
	const ctx = { db, mailer: createMemoryMailer(), baseUrl: 'http://test' };
	const kim = await register(ctx, {
		email: 'kim@example.org',
		password: 'password 1234',
		firstName: 'Kim',
		lastName: 'M',
		phone: '1',
		locale: 'de'
	});
	const lead = new Authz(
		false,
		[{ areaId: null, permissions: ['attendance.confirm', 'assignment.manage'] }],
		(id) => [id]
	);
	const shiftIn = async (areaId: string, start: string, end: string) => {
		const created = await createShift(db, actor, edition.id, {
			areaId,
			titleDe: 'Schicht',
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
					nameDe: 'Helfer*in',
					nameEn: '',
					descriptionDe: '',
					descriptionEn: '',
					capacity: 5,
					bookingMode: 'open'
				}
			]
		});
		return (await getShift(db, created.id))!;
	};
	const work = async (shift: Awaited<ReturnType<typeof shiftIn>>) => {
		const a = await bookPosition(
			{ db, now: new Date('2027-06-01T08:00:00Z') },
			kim.id,
			shift.positions[0].id,
			{
				editionId: edition.id,
				canSee: () => true
			}
		);
		await setAttendance({ db, now: shift.startsAt }, actor, lead, a.id, 'attended', TZ);
		return a;
	};
	return { db, edition, bar, abbau, kim, lead, shiftIn, work };
}

describe('points', () => {
	it('credits points on attendance and reverses corrections', async () => {
		const s = await seed();
		const shift = await s.shiftIn(s.bar.id, '2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z');
		const a = await bookPosition(
			{ db: s.db, now: new Date('2027-06-01T08:00:00Z') },
			s.kim.id,
			shift.positions[0].id,
			{
				editionId: s.edition.id,
				canSee: () => true
			}
		);
		expect(await pendingPoints(s.db, s.kim.id, s.edition.id)).toBe(1);
		expect(await pointsBalance(s.db, s.kim.id, s.edition.id)).toBe(0);

		const at = { db: s.db, now: new Date('2027-06-12T09:00:00Z') };
		await setAttendance(at, actor, s.lead, a.id, 'attended', TZ);
		expect(await pointsBalance(s.db, s.kim.id, s.edition.id)).toBe(1);
		await setAttendance(at, actor, s.lead, a.id, 'attended', TZ); // idempotent
		expect(await pointsBalance(s.db, s.kim.id, s.edition.id)).toBe(1);
		await setAttendance(at, actor, s.lead, a.id, 'no_show', TZ);
		expect(await pointsBalance(s.db, s.kim.id, s.edition.id)).toBe(0);
		await setAttendance(at, actor, s.lead, a.id, 'attended', TZ);
		await leadRemove(at, actor, s.lead, a.id);
		expect(await pointsBalance(s.db, s.kim.id, s.edition.id)).toBe(0);
		expect((await pointsHistory(s.db, s.kim.id, s.edition.id)).length).toBe(4);
	});

	it('uses area rules, hourly points and the night bonus', async () => {
		const s = await seed();
		await updateSettings(s.db, actor, { pointsPerHour: 1, nightBonus: 2 });
		// Abbau: 3 per shift (area) + 4 h × 1 + night bonus (22–02 local)
		await s.work(await s.shiftIn(s.abbau.id, '2027-06-12T20:00:00Z', '2027-06-13T00:00:00Z'));
		expect(await pointsBalance(s.db, s.kim.id, s.edition.id)).toBe(9);
	});

	it('supports manual adjustments with a reason', async () => {
		const s = await seed();
		await expectDomainError(
			adjustPoints(s.db, actor, {
				userId: s.kim.id,
				editionId: s.edition.id,
				amount: 2,
				reason: ' '
			}),
			'required'
		);
		await adjustPoints(s.db, actor, {
			userId: s.kim.id,
			editionId: s.edition.id,
			amount: 2,
			reason: 'Orga-Treffen'
		});
		expect(await pointsBalance(s.db, s.kim.id, s.edition.id)).toBe(2);
	});
});

describe('goodies', () => {
	it('lets helpers claim with confirmed points and cancel before pickup', async () => {
		const s = await seed();
		const shirt = await createGoodie(
			s.db,
			actor,
			s.edition.id,
			goodie({ nameDe: 'Shirt', price: 1, variants: ['M', 'L'] })
		);
		await expectDomainError(
			claimGoodie(s.db, actor, s.kim.id, shirt.id, 'M', s.edition.id),
			'goodie.notEnoughPoints'
		);
		await s.work(await s.shiftIn(s.bar.id, '2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z'));

		await expectDomainError(
			claimGoodie(s.db, actor, s.kim.id, shirt.id, null, s.edition.id),
			'variantRequired'
		);
		const claim = await claimGoodie(s.db, actor, s.kim.id, shirt.id, 'M', s.edition.id);
		expect(await pointsBalance(s.db, s.kim.id, s.edition.id)).toBe(0);
		await expectDomainError(
			claimGoodie(s.db, actor, s.kim.id, shirt.id, 'L', s.edition.id),
			'goodie.limitReached'
		);

		await cancelClaim(s.db, actor, claim.id, { editionId: s.edition.id, userId: s.kim.id }, true);
		expect(await pointsBalance(s.db, s.kim.id, s.edition.id)).toBe(1);
		const again = await claimGoodie(s.db, actor, s.kim.id, shirt.id, 'L', s.edition.id);
		await issueClaim(
			s.db,
			actor,
			again.id,
			{ editionId: s.edition.id, userId: s.kim.id },
			new Date()
		);
		await expectDomainError(
			cancelClaim(s.db, actor, again.id, { editionId: s.edition.id, userId: s.kim.id }, true),
			'claimNotOpen'
		);
	});

	it('enforces area restrictions, contingents and advance goodies', async () => {
		const s = await seed();
		const ruler = await createGoodie(
			s.db,
			actor,
			s.edition.id,
			goodie({ nameDe: 'Zollstock', price: 0, requiredAreaIds: [s.abbau.id] })
		);
		const hat = await createGoodie(
			s.db,
			actor,
			s.edition.id,
			goodie({ nameDe: 'Hut', price: 0, selfServiceLimit: 0 })
		);
		const early = await createGoodie(
			s.db,
			actor,
			s.edition.id,
			goodie({ nameDe: 'Shirt', price: 1, advance: true })
		);

		await expectDomainError(
			claimGoodie(s.db, actor, s.kim.id, ruler.id, null, s.edition.id),
			'goodie.notEligible'
		);
		await expectDomainError(
			claimGoodie(s.db, actor, s.kim.id, hat.id, null, s.edition.id),
			'goodie.soldOut'
		);
		// …but the desk can still hand it out
		await issueDirectly(s.db, actor, s.kim.id, hat.id, null, new Date());

		// Advance: allowed with points from a booked, not yet worked shift
		const shift = await s.shiftIn(s.abbau.id, '2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z');
		await bookPosition(
			{ db: s.db, now: new Date('2027-06-01T08:00:00Z') },
			s.kim.id,
			shift.positions[0].id,
			{
				editionId: s.edition.id,
				canSee: () => true
			}
		);
		await claimGoodie(s.db, actor, s.kim.id, early.id, null, s.edition.id);
		expect(await pointsBalance(s.db, s.kim.id, s.edition.id)).toBe(-1);

		const overview = await goodieOverview(s.db, s.kim.id, s.edition.id);
		expect(overview.goodies.find((g) => g.id === ruler.id)?.availability).toBe('notEligible');
	});

	it('redeems mandatory goodies automatically and supports refunds', async () => {
		const s = await seed();
		const ticket = await createGoodie(
			s.db,
			actor,
			s.edition.id,
			goodie({ nameDe: 'Freiticket', price: 1, mandatory: true, refundable: true })
		);
		await s.work(await s.shiftIn(s.bar.id, '2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z'));
		const overview = await goodieOverview(s.db, s.kim.id, s.edition.id);
		expect(overview.balance).toBe(0);
		const claim = overview.claims.find((c) => c.goodie.id === ticket.id)!.claim;
		expect(claim.status).toBe('selected');

		// Mandatory goodies cannot be swapped back into points by the helper…
		await expectDomainError(
			cancelClaim(s.db, actor, claim.id, { editionId: s.edition.id, userId: s.kim.id }, true),
			'claimNotOpen'
		);
		// …but can be turned into a refund ("I already have a ticket").
		await requestRefund(s.db, { editionId: s.edition.id, userId: s.kim.id }, claim.id);
		await markRefunded(
			s.db,
			actor,
			claim.id,
			{ editionId: s.edition.id, userId: s.kim.id },
			new Date()
		);
		expect(await pointsBalance(s.db, s.kim.id, s.edition.id)).toBe(0);

		// A second shift does not redeem the ticket again.
		await s.work(await s.shiftIn(s.bar.id, '2027-06-13T10:00:00Z', '2027-06-13T14:00:00Z'));
		expect(await pointsBalance(s.db, s.kim.id, s.edition.id)).toBe(1);
	});
});

describe('mandatory goodies come first', () => {
	it('reserves points for an open mandatory goodie', async () => {
		const s = await seed();
		await createGoodie(
			s.db,
			actor,
			s.edition.id,
			goodie({ nameDe: 'Freiticket', price: 1, mandatory: true })
		);
		const shirt = await createGoodie(
			s.db,
			actor,
			s.edition.id,
			goodie({ nameDe: 'Shirt', price: 1, advance: true })
		);
		const shift = await s.shiftIn(s.bar.id, '2027-06-12T10:00:00Z', '2027-06-12T14:00:00Z');
		await bookPosition(
			{ db: s.db, now: new Date('2027-06-01T08:00:00Z') },
			s.kim.id,
			shift.positions[0].id,
			{
				editionId: s.edition.id,
				canSee: () => true
			}
		);
		// 1 pending point – but it is reserved for the ticket.
		await expectDomainError(
			claimGoodie(s.db, actor, s.kim.id, shirt.id, null, s.edition.id),
			'goodie.notEnoughPoints'
		);
		await expectDomainError(
			issueDirectly(s.db, actor, s.kim.id, shirt.id, null, new Date()),
			'goodie.notEnoughPoints'
		);
	});
});
