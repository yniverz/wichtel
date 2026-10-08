import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { auditLog, roleAssignments, roles, users } from '../db/schema.ts';
import { DomainError } from '../errors.ts';
import { createTestDatabase } from '../testing/db.ts';
import { createArea } from './areas.ts';
import { bookPosition, leadAssign } from './assignments.ts';
import { involvedInEdition } from '../desk.ts';
import { createEdition, makeCurrentEdition, setEditionArchived } from './editions.ts';
import { createPlace, deletePlace } from './places.ts';
import { exportPersonalData } from './privacy.ts';
import { loadAuthz, removeAssignment } from './roles.ts';
import { invalidateSettingsCache } from './settings.ts';
import { createShift, getShift } from './shifts.ts';
import { callUrgent } from './urgent.ts';
import { createWave, deleteWave } from './waves.ts';

/** Rights only apply to the edition they were given for; a former lead keeps nothing. */

let database: Database;
const actor = { userId: null };
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

const area = (name: string) => ({
	parentId: null,
	nameDe: name,
	nameEn: '',
	descriptionDe: '',
	descriptionEn: '',
	sortOrder: 0,
	cancelDeadlineHours: null,
	pointsPerShift: null,
	pointsPerHour: null
});

async function seed() {
	const db = database.db;
	const past = await createEdition(db, actor, {
		name: '2025',
		startsOn: '2025-06-01',
		endsOn: '2025-06-30'
	});
	const current = await createEdition(db, actor, {
		name: '2026',
		startsOn: '2026-06-01',
		endsOn: '2026-06-30'
	});
	await makeCurrentEdition(db, actor, current.id);
	const pastArea = await createArea(db, actor, past.id, area('Bar 2025'));
	const currentArea = await createArea(db, actor, current.id, area('Bar 2026'));
	const created = await createShift(db, actor, current.id, {
		areaId: currentArea.id,
		titleDe: 'Bar',
		titleEn: '',
		descriptionDe: '',
		descriptionEn: '',
		location: '',
		meetingPoint: '',
		contact: '',
		visibility: 'public',
		cancelDeadlineHours: null,
		startsAt: new Date('2026-06-12T10:00:00Z'),
		endsAt: new Date('2026-06-12T14:00:00Z'),
		positions: [
			{
				nameDe: 'Theke',
				nameEn: '',
				descriptionDe: '',
				descriptionEn: '',
				capacity: 2,
				bookingMode: 'open'
			}
		]
	});
	const shift = (await getShift(db, created.id))!;

	const [ex, lead, helper] = await db
		.insert(users)
		.values([
			{ email: 'ex@x.org', firstName: 'Ex', lastName: 'Lead' },
			{ email: 'lead@x.org', firstName: 'Lea', lastName: 'Lead' },
			{ email: 'kim@x.org', firstName: 'Kim', lastName: 'Helper', phone: '0170 1' }
		])
		.returning();
	const [everything] = await db
		.insert(roles)
		.values({
			nameDe: 'Gesamtleitung',
			permissions: [
				'shift.manage',
				'assignment.manage',
				'assignment.override',
				'role.assign',
				'helper.contact.view'
			]
		})
		.returning();
	// The former lead had an edition-wide role last year; the lead has one this year.
	await db.insert(roleAssignments).values([
		{ userId: ex.id, roleId: everything.id, editionId: past.id, areaId: null },
		{ userId: lead.id, roleId: everything.id, editionId: current.id, areaId: null }
	]);
	const [leadGrant] = await db
		.select()
		.from(roleAssignments)
		.where(eq(roleAssignments.userId, lead.id));
	return { db, past, current, pastArea, currentArea, shift, ex, lead, helper, leadGrant };
}

describe('edition isolation', () => {
	it('a former lead cannot act on the current edition', async () => {
		const s = await seed();
		const exAuthz = await loadAuthz(s.db, s.ex, s.past.id);
		expect(exAuthz.can('shift.manage', s.pastArea.id)).toBe(true);
		expect(exAuthz.can('shift.manage', s.currentArea.id)).toBe(false);

		const ctx = { db: s.db, now: new Date('2026-06-01T10:00:00Z') };
		await expectDomainError(
			leadAssign(ctx, actor, exAuthz, {
				positionId: s.shift.positions[0].id,
				userId: s.helper.id,
				override: true
			}),
			'forbidden'
		);
		await expect(
			callUrgent(s.db, actor, exAuthz, s.shift.positions[0].id, { bonus: 0, note: '' }, ctx.now)
		).rejects.toBeInstanceOf(DomainError);
		await expectDomainError(
			removeAssignment(s.db, actor, exAuthz, s.leadGrant.id, s.past.id),
			'notFound'
		);

		const wave = await createWave(s.db, actor, s.current.id, {
			name: 'Crew',
			opensAt: new Date('2026-05-01T00:00:00Z'),
			closesAt: null,
			areaIds: [],
			audience: 'crew'
		});
		await expectDomainError(deleteWave(s.db, actor, s.past.id, wave.id), 'notFound');
		const place = await createPlace(s.db, actor, s.current.id, {
			nameDe: 'Tor',
			nameEn: '',
			descriptionDe: '',
			descriptionEn: '',
			address: '',
			lat: null,
			lng: null,
			planX: null,
			planY: null,
			sortOrder: 0
		});
		await expectDomainError(deletePlace(s.db, actor, s.past.id, place.id), 'notFound');
	});

	it('contact data only comes with a role in the current edition', async () => {
		const s = await seed();
		expect((await loadAuthz(s.db, s.ex, s.past.id)).can('helper.contact.view')).toBe(false);
		expect((await loadAuthz(s.db, s.ex, s.past.id)).can('shift.manage')).toBe(true);
		expect((await loadAuthz(s.db, s.lead, s.current.id)).can('helper.contact.view')).toBe(true);
	});

	it('roles of archived editions give no rights at all', async () => {
		const s = await seed();
		await setEditionArchived(s.db, actor, s.past.id, true);
		expect((await loadAuthz(s.db, s.ex, s.past.id)).hasAnyGrant).toBe(false);
	});
});

describe('desk', () => {
	it('only knows people who take part in the edition', async () => {
		const s = await seed();
		const ids = [s.helper.id, s.ex.id];
		expect(await involvedInEdition(s.db, ids, s.current.id)).toEqual(new Set());
		await bookPosition(
			{ db: s.db, now: new Date('2026-06-01T00:00:00Z') },
			s.helper.id,
			s.shift.positions[0].id,
			{
				editionId: s.current.id,
				canSee: () => true
			}
		);
		expect(await involvedInEdition(s.db, ids, s.current.id)).toEqual(new Set([s.helper.id]));
		expect(await involvedInEdition(s.db, ids, s.past.id)).toEqual(new Set());
	});
});

describe('data export', () => {
	it('does not reveal the IP addresses of others', async () => {
		const s = await seed();
		await s.db.insert(auditLog).values([
			{
				actorId: s.lead.id,
				action: 'role_assignment.create',
				entityType: 'user',
				entityId: s.helper.id,
				ip: '198.51.100.7'
			},
			{
				actorId: s.helper.id,
				action: 'swap.offer',
				entityType: 'shift',
				ip: '203.0.113.9'
			}
		]);
		const json = JSON.stringify(await exportPersonalData(s.db, s.helper.id));
		expect(json).toContain('203.0.113.9');
		expect(json).not.toContain('198.51.100.7');
	});
});
