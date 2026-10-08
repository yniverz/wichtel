import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { assignments, auditLog, emailOutbox, pointsLedger, users } from '../db/schema.ts';
import { DomainError } from '../errors.ts';
import { createMemoryMailer } from '../mail.ts';
import { createTestDatabase } from '../testing/db.ts';
import { authenticate, register } from './accounts.ts';
import { createArea } from './areas.ts';
import { bookPosition, joinWaitlist, listUserAssignments } from './assignments.ts';
import { createEdition } from './editions.ts';
import { adjustPoints } from './points.ts';
import { deleteAccount, deleteOwnAccount, exportPersonalData, runRetention } from './privacy.ts';
import { invalidateSettingsCache, updateSettings } from './settings.ts';
import { createShift, getShift, type ShiftInput } from './shifts.ts';

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
			phone: '0170 1234567',
			locale: 'de'
		});
		const [verified] = await db
			.update(users)
			.set({ emailVerifiedAt: new Date() })
			.where(eq(users.id, user.id))
			.returning();
		return verified;
	};
	const admin = await person('admin@x.org', 'Ada');
	await db.update(users).set({ isAdmin: true }).where(eq(users.id, admin.id));
	const a = await person('a@x.org', 'Anna');
	const b = await person('b@x.org', 'Ben');
	const shift = async (start: string, end: string) =>
		(await getShift(
			db,
			(
				await createShift(db, actor, edition.id, {
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
							nameDe: 'Theke',
							nameEn: '',
							descriptionDe: '',
							descriptionEn: '',
							capacity: 1,
							bookingMode: 'open'
						}
					]
				} satisfies ShiftInput)
			).id
		))!;
	const bookingCtx = { db, now: new Date('2027-06-01T10:00:00Z') };
	const opts = { editionId: edition.id, canSee: () => true };
	const ctxAt = (now: Date) => ({ db, uploadDir: '/nonexistent', now });
	return { db, edition, admin, a, b, shift, bookingCtx, opts, ctxAt };
}

describe('deleting an account', () => {
	it('removes personal data, keeps past shifts and points, frees upcoming places', async () => {
		const s = await seed();
		const past = await s.shift('2027-06-05T10:00:00Z', '2027-06-05T14:00:00Z');
		const upcoming = await s.shift('2027-06-20T10:00:00Z', '2027-06-20T14:00:00Z');
		await bookPosition(s.bookingCtx, s.a.id, past.positions[0].id, s.opts);
		await bookPosition(s.bookingCtx, s.a.id, upcoming.positions[0].id, s.opts);
		await joinWaitlist(s.bookingCtx, s.b.id, upcoming.positions[0].id, s.opts);
		await adjustPoints(s.db, actor, {
			editionId: s.edition.id,
			userId: s.a.id,
			amount: 3,
			reason: 'Danke'
		});
		await s.db.insert(auditLog).values({
			actorId: s.a.id,
			action: 'test',
			entityType: 'user',
			entityId: s.a.id,
			data: { email: 'a@x.org' },
			ip: '192.0.2.1'
		});

		await deleteAccount(s.ctxAt(new Date('2027-06-10T00:00:00Z')), actor, s.a.id, 'admin');

		const [gone] = await s.db.select().from(users).where(eq(users.id, s.a.id));
		expect(gone.deletedAt).not.toBeNull();
		expect(gone.email).not.toContain('a@x.org');
		expect(gone.firstName).toBe('Gelöschtes Konto');
		expect(gone.phone).toBe('');
		expect(gone.passwordHash).toBeNull();
		await expectDomainError(authenticate(s.db, 'a@x.org', 'password 1234'), 'invalidCredentials');

		// Past shift stays, upcoming one is freed and goes to the waiting list.
		const rows = await s.db.select().from(assignments).where(eq(assignments.userId, s.a.id));
		expect(rows.find((r) => r.shiftId === past.id)?.status).toBe('booked');
		expect(rows.find((r) => r.shiftId === upcoming.id)?.status).toBe('cancelled');
		expect((await listUserAssignments(s.db, s.b.id, s.edition.id)).map((x) => x.status)).toEqual([
			'booked'
		]);
		expect(
			await s.db.select().from(pointsLedger).where(eq(pointsLedger.userId, s.a.id))
		).toHaveLength(1);

		// The audit log forgets details and addresses.
		const entries = await s.db.select().from(auditLog).where(eq(auditLog.actorId, s.a.id));
		expect(entries.every((e) => e.ip === null)).toBe(true);
		expect(entries.find((e) => e.action === 'test')?.data).toEqual({});
		const [deletion] = await s.db.select().from(auditLog).where(eq(auditLog.action, 'user.delete'));
		expect(deletion.data).toMatchObject({ reason: 'admin', cancelledBookings: 1 });

		// No mail ever goes to the placeholder address.
		const mails = await s.db.select().from(emailOutbox).where(eq(emailOutbox.to, gone.email));
		expect(mails).toHaveLength(0);
	});

	it('keeps the last admin and checks the password', async () => {
		const s = await seed();
		await expectDomainError(
			deleteAccount(s.ctxAt(new Date()), actor, s.admin.id, 'admin'),
			'lastAdmin'
		);
		await expectDomainError(
			deleteOwnAccount(s.ctxAt(new Date()), s.a, 'wrong password'),
			'wrongPassword'
		);
		await deleteOwnAccount(s.ctxAt(new Date()), s.a, 'password 1234');
		await expectDomainError(deleteAccount(s.ctxAt(new Date()), actor, s.a.id, 'admin'), 'notFound');
	});
});

describe('data export', () => {
	it('contains the account and the shifts, but no secrets', async () => {
		const s = await seed();
		const shift = await s.shift('2027-06-05T10:00:00Z', '2027-06-05T14:00:00Z');
		await bookPosition(s.bookingCtx, s.a.id, shift.positions[0].id, s.opts);
		const data = await exportPersonalData(s.db, s.a.id);
		expect(data.account.email).toBe('a@x.org');
		expect(data.shifts).toHaveLength(1);
		expect(data.shifts[0]).toMatchObject({ shift: 'Bar', position: 'Theke', status: 'booked' });
		const json = JSON.stringify(data);
		expect(json).not.toContain(s.a.passwordHash!);
		expect(json).not.toContain(s.a.calendarToken);
		expect(json).not.toContain(s.a.qrToken);
	});
});

describe('retention', () => {
	it('tells inactive people first and anonymises them two weeks later', async () => {
		const s = await seed();
		await updateSettings(s.db, actor, { retentionMonths: 12, auditIpDays: 30 });
		const shift = await s.shift('2027-06-05T10:00:00Z', '2027-06-05T14:00:00Z');
		await bookPosition(s.bookingCtx, s.a.id, shift.positions[0].id, s.opts);
		const longAgo = new Date('2026-01-01T00:00:00Z');
		await s.db.update(users).set({ lastSeenAt: longAgo, createdAt: longAgo });
		// Ben was here recently.
		await s.db
			.update(users)
			.set({ lastSeenAt: new Date('2028-12-01T00:00:00Z') })
			.where(eq(users.id, s.b.id));
		await s.db.insert(auditLog).values({
			action: 'old',
			entityType: 'x',
			ip: '192.0.2.1',
			createdAt: longAgo
		});

		// Anna's last activity is her shift in June 2027; a year later she is told.
		const now = new Date('2028-06-01T00:00:00Z');
		expect(await runRetention(s.ctxAt(now))).toEqual({ noticed: 1, deleted: 0 });
		const notice = await s.db.select().from(emailOutbox).where(eq(emailOutbox.to, 'a@x.org'));
		expect(notice.at(-1)?.subject).toContain('wird bald gelöscht');
		// Nothing new the next day.
		expect(await runRetention(s.ctxAt(new Date('2028-06-02T00:00:00Z')))).toEqual({
			noticed: 0,
			deleted: 0
		});

		const later = new Date('2028-06-16T00:00:00Z');
		expect(await runRetention(s.ctxAt(later))).toEqual({ noticed: 0, deleted: 1 });
		const [anna] = await s.db.select().from(users).where(eq(users.id, s.a.id));
		const [ben] = await s.db.select().from(users).where(eq(users.id, s.b.id));
		const [admin] = await s.db.select().from(users).where(eq(users.id, s.admin.id));
		expect(anna.deletedAt).not.toBeNull();
		expect(ben.deletedAt).toBeNull();
		expect(admin.deletedAt).toBeNull();

		const [old] = await s.db.select().from(auditLog).where(eq(auditLog.action, 'old'));
		expect(old.ip).toBeNull();
	});

	it('does nothing when switched off', async () => {
		const s = await seed();
		await updateSettings(s.db, actor, { retentionMonths: 0 });
		await s.db.update(users).set({ lastSeenAt: new Date('2020-01-01T00:00:00Z') });
		expect(await runRetention(s.ctxAt(new Date('2030-01-01T00:00:00Z')))).toEqual({
			noticed: 0,
			deleted: 0
		});
	});
});
