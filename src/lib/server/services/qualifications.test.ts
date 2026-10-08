import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Authz } from '#lib/domain/permissions.ts';
import type { Database } from '../db/client.ts';
import { DomainError } from '../errors.ts';
import { createMemoryMailer } from '../mail.ts';
import { createTestDatabase } from '../testing/db.ts';
import { register } from './accounts.ts';
import { createArea } from './areas.ts';
import { bookPosition, leadAssign } from './assignments.ts';
import { createEdition } from './editions.ts';
import {
	applyForQualification,
	createQualification,
	grantQualification,
	heldQualificationIds,
	listUserQualifications,
	reviewQualification,
	type QualificationInput
} from './qualifications.ts';
import { createShift, getShift } from './shifts.ts';

let database: Database;
let uploadDir: string;
const actor = { userId: null };

beforeEach(async () => {
	database = await createTestDatabase();
	uploadDir = await mkdtemp(path.join(tmpdir(), 'wichtel-test-'));
});
afterEach(async () => {
	await database.close();
	await rm(uploadDir, { recursive: true, force: true });
});

async function expectDomainError(promise: Promise<unknown>, code: string) {
	await expect(promise).rejects.toSatisfy((e) => e instanceof DomainError && e.code === code);
}

const qualification = (input: Partial<QualificationInput>): QualificationInput => ({
	nameDe: 'Hygieneschulung',
	nameEn: '',
	descriptionDe: '',
	descriptionEn: '',
	proof: 'either',
	documentRetention: 'delete_after_review',
	validityDays: null,
	active: true,
	sortOrder: 0,
	...input
});

const pdf = () =>
	new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])], 'nachweis.pdf', {
		type: 'application/pdf'
	});
const privateFiles = async () => readdir(path.join(uploadDir, 'private')).catch(() => []);

async function person(email = 'kim@example.org') {
	return register(
		{ db: database.db, mailer: createMemoryMailer(), baseUrl: 'http://test' },
		{ email, password: 'password 1234', firstName: 'Kim', lastName: 'M', phone: '1', locale: 'de' }
	);
}

describe('qualifications', () => {
	it('checks the proof rules and keeps documents private', async () => {
		const kim = await person();
		const upload = await createQualification(
			database.db,
			actor,
			qualification({ proof: 'upload' })
		);
		const confirm = await createQualification(
			database.db,
			actor,
			qualification({ nameDe: 'Ü18', proof: 'confirm' })
		);
		const apply = (qualificationId: string, confirmed: boolean, document: File | null) =>
			applyForQualification(database.db, uploadDir, kim.id, {
				qualificationId,
				confirmed,
				document,
				note: ''
			});

		await expectDomainError(apply(upload.id, true, null), 'documentRequired');
		await expectDomainError(apply(confirm.id, false, null), 'confirmRequired');
		await expectDomainError(
			apply(upload.id, false, new File([new Uint8Array([1, 2, 3, 4])], 'x.exe')),
			'documentType'
		);
		await apply(upload.id, false, pdf());
		await apply(confirm.id, true, null);
		expect(await privateFiles()).toHaveLength(1);
	});

	it('approves with expiry and deletes documents after review', async () => {
		const kim = await person();
		const q = await createQualification(database.db, actor, qualification({ validityDays: 365 }));
		await applyForQualification(database.db, uploadDir, kim.id, {
			qualificationId: q.id,
			confirmed: false,
			document: pdf(),
			note: 'Zertifikat'
		});
		const [{ entry }] = await listUserQualifications(database.db, kim.id);
		const now = new Date('2027-01-01T00:00:00Z');
		await reviewQualification(database.db, uploadDir, actor, {
			id: entry.id,
			approve: true,
			reviewNote: '',
			now
		});

		expect(await privateFiles()).toHaveLength(0);
		const [{ entry: after }] = await listUserQualifications(database.db, kim.id);
		expect(after.documentId).toBeNull();
		expect(after.expiresAt?.toISOString()).toBe('2028-01-01T00:00:00.000Z');
		expect(await heldQualificationIds(database.db, kim.id, now)).toEqual([q.id]);
		expect(
			await heldQualificationIds(database.db, kim.id, new Date('2028-06-01T00:00:00Z'))
		).toEqual([]);
		await expectDomainError(
			applyForQualification(database.db, uploadDir, kim.id, {
				qualificationId: q.id,
				confirmed: true,
				document: null,
				note: ''
			}),
			'qualificationHeld'
		);
	});

	it('gates positions that require a qualification', async () => {
		const db = database.db;
		const kim = await person();
		const lou = await person('lou@example.org');
		const q = await createQualification(db, actor, qualification({}));
		const edition = await createEdition(db, actor, {
			name: 'Fest',
			startsOn: '2027-06-01',
			endsOn: '2027-06-30'
		});
		const area = await createArea(db, actor, edition.id, {
			parentId: null,
			nameDe: 'Küche',
			nameEn: '',
			descriptionDe: '',
			descriptionEn: '',
			sortOrder: 0,
			cancelDeadlineHours: null,
			pointsPerShift: null,
			pointsPerHour: null
		});
		const created = await createShift(db, actor, edition.id, {
			areaId: area.id,
			titleDe: 'Essensausgabe',
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
					nameDe: 'Ausgabe',
					nameEn: '',
					descriptionDe: '',
					descriptionEn: '',
					capacity: 3,
					bookingMode: 'open',
					requiredQualificationIds: [q.id]
				}
			]
		});
		const shift = (await getShift(db, created.id))!;
		const ctx = { db, now: new Date('2027-06-01T10:00:00Z') };
		const opts = { editionId: edition.id, canSee: () => true };

		await expectDomainError(
			bookPosition(ctx, kim.id, shift.positions[0].id, opts),
			'qualificationMissing'
		);
		await grantQualification(db, actor, { userId: kim.id, qualificationId: q.id, now: ctx.now });
		await bookPosition(ctx, kim.id, shift.positions[0].id, opts);

		const lead = new Authz(false, [{ areaId: null, permissions: ['assignment.manage'] }], (id) => [
			id
		]);
		const result = await leadAssign(ctx, actor, lead, {
			positionId: shift.positions[0].id,
			userId: lou.id,
			override: false
		});
		expect(result.issues).toEqual(['qualification']);
	});
});
