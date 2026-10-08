import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { auditLog, emailOutbox, users } from '../db/schema.ts';
import { createSession, invalidateUserSessions, validateSession } from '../sessions.ts';
import { createTestDatabase } from '../testing/db.ts';
import { DomainError } from '../errors.ts';
import {
	authenticate,
	changePassword,
	register,
	registerOrNotify,
	requestPasswordReset,
	resetPassword,
	setAdmin,
	verifyEmail,
	type AccountContext
} from './accounts.ts';
import { createArea, deleteArea, updateArea } from './areas.ts';
import { createEdition, getCurrentEdition, makeCurrentEdition } from './editions.ts';
import { assignRole, createRole, loadAuthz, removeAssignment } from './roles.ts';
import { checkSetupToken, completeSetup, isSetupComplete, prepareSetup } from './setup.ts';
import { updateSettings } from './settings.ts';

let database: Database;
let ctx: AccountContext;

beforeEach(async () => {
	database = await createTestDatabase();
	ctx = { db: database.db, baseUrl: 'http://test' };
});
afterEach(async () => {
	await database.close();
});

const helper = {
	email: 'Kim@Example.org',
	password: 'correct horse battery',
	firstName: 'Kim',
	lastName: 'Muster',
	phone: '+49 151 1234567',
	locale: 'de' as const
};

/** Account mails go through the outbox. */
async function outbox() {
	return database.db.select().from(emailOutbox).orderBy(asc(emailOutbox.createdAt));
}

async function tokenFromMail(index = -1): Promise<string> {
	const text = (await outbox()).at(index)!.text;
	return new URL(text.match(/http:\/\/test\S+/)![0]).searchParams.get('token')!;
}

async function expectDomainError(promise: Promise<unknown>, code: string) {
	await expect(promise).rejects.toSatisfy((e) => e instanceof DomainError && e.code === code);
}

describe('accounts', () => {
	it('needs no confirmation when no mail server is configured', async () => {
		const user = await register({ ...ctx, skipEmailVerification: true }, helper);
		expect(user.emailVerifiedAt).toBeInstanceOf(Date);
		expect(await outbox()).toHaveLength(0);
	});

	it('registers, verifies and logs in', async () => {
		const user = await register(ctx, helper);
		expect(user.email).toBe('kim@example.org');
		expect(user.emailVerifiedAt).toBeNull();
		expect(await outbox()).toHaveLength(1);

		const verified = await verifyEmail(database.db, await tokenFromMail());
		expect(verified?.emailVerifiedAt).toBeInstanceOf(Date);
		// The link keeps working (mail scanners may open it first).
		expect(await verifyEmail(database.db, await tokenFromMail())).not.toBeNull();
		expect(await verifyEmail(database.db, 'wrong')).toBeNull();

		const loggedIn = await authenticate(database.db, 'KIM@example.org', helper.password);
		expect(loggedIn.id).toBe(user.id);
		await expectDomainError(
			authenticate(database.db, helper.email, 'wrong password'),
			'invalidCredentials'
		);
		await expectDomainError(
			authenticate(database.db, 'nobody@x.de', 'whatever123'),
			'invalidCredentials'
		);
	});

	it('rejects duplicate e-mails and closed registration', async () => {
		await register(ctx, helper);
		await expectDomainError(register(ctx, { ...helper, email: 'kim@example.org' }), 'emailTaken');
		// Without revealing it: the owner gets a mail, the caller sees the same as for a new account.
		expect(await registerOrNotify(ctx, { ...helper, email: 'kim@example.org' })).toBeNull();
		const notice = (await outbox()).at(-1)!;
		expect(notice.to).toBe('kim@example.org');
		expect(notice.subject).toContain('Du hast schon ein Konto');
		await resetPassword(database.db, await tokenFromMail(), 'taken over by owner');
		expect(await registerOrNotify(ctx, { ...helper, email: 'new@example.org' })).not.toBeNull();
		await expectDomainError(
			registerOrNotify(
				{ ...ctx, skipEmailVerification: true },
				{ ...helper, email: 'kim@example.org' }
			),
			'emailTaken'
		);
		await updateSettings(database.db, { userId: null }, { registrationOpen: false });
		await expectDomainError(
			register(ctx, { ...helper, email: 'other@example.org' }),
			'registrationClosed'
		);
	});

	it('resets passwords with single-use tokens and revokes sessions', async () => {
		const user = await register(ctx, helper);
		const session = await createSession(database.db, user.id);
		await requestPasswordReset(ctx, helper.email);
		const token = await tokenFromMail();

		await resetPassword(database.db, token, 'a brand new password');
		await expectDomainError(resetPassword(database.db, token, 'again and again'), 'invalidToken');
		expect(await validateSession(database.db, session.token)).toBeNull();
		await authenticate(database.db, helper.email, 'a brand new password');

		// Unknown addresses do not send anything and do not throw.
		const before = (await outbox()).length;
		await requestPasswordReset(ctx, 'unknown@example.org');
		expect(await outbox()).toHaveLength(before);
	});

	it('changes passwords only with the current password', async () => {
		const user = await register(ctx, helper);
		await expectDomainError(
			changePassword(database.db, user, 'nope', 'new password 123'),
			'wrongPassword'
		);
		await changePassword(database.db, user, helper.password, 'new password 123');
		await authenticate(database.db, helper.email, 'new password 123');
	});
});

describe('sessions', () => {
	it('validates and invalidates sessions', async () => {
		const user = await register(ctx, helper);
		const { token } = await createSession(database.db, user.id);
		expect((await validateSession(database.db, token))?.user.id).toBe(user.id);
		expect(await validateSession(database.db, token + 'x')).toBeNull();
		await invalidateUserSessions(database.db, user.id);
		expect(await validateSession(database.db, token)).toBeNull();
	});
});

describe('setup', () => {
	it('creates the first admin, roles and edition exactly once', async () => {
		const token = await prepareSetup(database.db);
		expect(token).toBeTruthy();
		expect(await checkSetupToken(database.db, 'wrong')).toBe(false);

		const admin = await completeSetup(database.db, {
			token: token!,
			festivalName: 'Testfest',
			firstName: 'Ada',
			lastName: 'Admin',
			email: 'ada@example.org',
			phone: '+49 1',
			password: 'admin password 1',
			locale: 'de',
			editionName: 'Testfest 2027',
			startsOn: '2027-05-24',
			endsOn: '2027-06-13'
		});
		expect(admin.isAdmin).toBe(true);
		expect(await isSetupComplete(database.db)).toBe(true);
		expect((await getCurrentEdition(database.db))?.name).toBe('Testfest 2027');
		expect(await prepareSetup(database.db)).toBeNull();
		await expectDomainError(
			completeSetup(database.db, {
				token: token!,
				festivalName: 'x',
				firstName: 'x',
				lastName: 'x',
				email: 'x@example.org',
				phone: '1',
				password: 'xxxxxxxxxx',
				locale: 'de',
				editionName: 'x',
				startsOn: '2027-01-01',
				endsOn: '2027-01-02'
			}),
			'setupDone'
		);
	});
});

describe('editions, areas and roles', () => {
	async function seed() {
		const actor = { userId: null };
		const edition = await createEdition(database.db, actor, {
			name: 'Fest 2027',
			startsOn: '2027-05-24',
			endsOn: '2027-06-13'
		});
		const area = (parentId: string | null, nameDe: string) =>
			createArea(database.db, actor, edition.id, {
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
		const infra = await area(null, 'Infrastruktur');
		const aufbau = await area(infra.id, 'Aufbau');
		const buehne = await area(aufbau.id, 'Bühne');
		const awareness = await area(null, 'Awareness');
		return { actor, edition, infra, aufbau, buehne, awareness };
	}

	it('keeps exactly one current edition', async () => {
		const { edition } = await seed();
		expect(edition.isCurrent).toBe(true);
		const next = await createEdition(
			database.db,
			{ userId: null },
			{
				name: 'Fest 2028',
				startsOn: '2028-05-01',
				endsOn: '2028-05-30'
			}
		);
		expect(next.isCurrent).toBe(false);
		await makeCurrentEdition(database.db, { userId: null }, next.id);
		expect((await getCurrentEdition(database.db))?.id).toBe(next.id);
		await expectDomainError(
			createEdition(
				database.db,
				{ userId: null },
				{ name: 'x', startsOn: '2028-02-02', endsOn: '2028-01-01' }
			),
			'invalidDateRange'
		);
	});

	it('prevents cycles and deleting areas with children', async () => {
		const { actor, edition, infra, buehne } = await seed();
		const move = (id: string, parentId: string | null, nameDe: string) =>
			updateArea(database.db, actor, edition.id, id, {
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
		await expectDomainError(move(infra.id, buehne.id, 'Infrastruktur'), 'areaCycle');
		await expectDomainError(
			deleteArea(database.db, actor, edition.id, infra.id),
			'areaHasChildren'
		);
		await move(buehne.id, null, 'Bühne');
		await deleteArea(database.db, actor, edition.id, buehne.id);
	});

	it('enforces role assignment rules and writes the audit log', async () => {
		const { actor, edition, aufbau, buehne, awareness } = await seed();
		const lead = await register(ctx, helper);
		const other = await register(ctx, { ...helper, email: 'other@example.org' });
		const admin = await register(ctx, { ...helper, email: 'admin@example.org' });
		await database.db.update(users).set({ isAdmin: true }).where(eq(users.id, admin.id));

		const leadRole = await createRole(database.db, actor, {
			nameDe: 'Bereichsleitung',
			nameEn: '',
			descriptionDe: '',
			descriptionEn: '',
			permissions: ['role.assign', 'attendance.confirm']
		});
		const shiftLead = await createRole(database.db, actor, {
			nameDe: 'Schichtleitung',
			nameEn: '',
			descriptionDe: '',
			descriptionEn: '',
			permissions: ['attendance.confirm']
		});
		const powerful = await createRole(database.db, actor, {
			nameDe: 'Punkte',
			nameEn: '',
			descriptionDe: '',
			descriptionEn: '',
			permissions: ['points.adjust']
		});

		const adminAuthz = await loadAuthz(database.db, { ...admin, isAdmin: true }, edition.id);
		await assignRole(database.db, { userId: admin.id }, adminAuthz, {
			userId: lead.id,
			roleId: leadRole.id,
			editionId: edition.id,
			areaId: aufbau.id
		});
		await expectDomainError(
			assignRole(database.db, { userId: admin.id }, adminAuthz, {
				userId: lead.id,
				roleId: leadRole.id,
				editionId: edition.id,
				areaId: aufbau.id
			}),
			'alreadyAssigned'
		);

		const leadAuthz = await loadAuthz(database.db, lead, edition.id);
		expect(leadAuthz.can('attendance.confirm', buehne.id)).toBe(true);
		expect(leadAuthz.can('attendance.confirm', awareness.id)).toBe(false);

		// Within own sub-tree and own permissions: allowed.
		await assignRole(database.db, { userId: lead.id }, leadAuthz, {
			userId: other.id,
			roleId: shiftLead.id,
			editionId: edition.id,
			areaId: buehne.id
		});
		// More permissions than the lead has, or outside the sub-tree: refused.
		await expectDomainError(
			assignRole(database.db, { userId: lead.id }, leadAuthz, {
				userId: other.id,
				roleId: powerful.id,
				editionId: edition.id,
				areaId: buehne.id
			}),
			'cannotAssignRole'
		);
		await expectDomainError(
			assignRole(database.db, { userId: lead.id }, leadAuthz, {
				userId: other.id,
				roleId: shiftLead.id,
				editionId: edition.id,
				areaId: awareness.id
			}),
			'cannotAssignRole'
		);

		const otherAuthz = await loadAuthz(database.db, other, edition.id);
		expect(otherAuthz.can('attendance.confirm', buehne.id)).toBe(true);

		const entries = await database.db
			.select()
			.from(auditLog)
			.where(eq(auditLog.action, 'role_assignment.create'));
		expect(entries).toHaveLength(2);

		// Removing follows the same rule.
		const [assignment] = await database.db.query.roleAssignments.findMany({
			where: (t, { eq }) => eq(t.userId, other.id)
		});
		await removeAssignment(database.db, { userId: lead.id }, leadAuthz, assignment.id, edition.id);
		expect((await loadAuthz(database.db, other, edition.id)).hasAnyGrant).toBe(false);
	});

	it('never removes the last admin', async () => {
		const admin = await register(ctx, helper);
		await setAdmin(database.db, { userId: null }, admin.id, true);
		await expectDomainError(setAdmin(database.db, { userId: null }, admin.id, false), 'lastAdmin');
	});
});
