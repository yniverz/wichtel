import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Database } from '../db/client.ts';
import { auditLog, emailOutbox, emailTokens, users } from '../db/schema.ts';
import { DomainError } from '../errors.ts';
import { createTestDatabase } from '../testing/db.ts';
import { register, requestPasswordReset, updateAccount } from './accounts.ts';
import { invalidateSettingsCache } from './settings.ts';

let database: Database;
beforeEach(async () => {
	invalidateSettingsCache();
	database = await createTestDatabase();
});
afterEach(async () => {
	invalidateSettingsCache();
	await database.close();
});

const admin = { userId: null };

async function expectDomainError(promise: Promise<unknown>, code: string) {
	await expect(promise).rejects.toSatisfy((e) => e instanceof DomainError && e.code === code);
}

async function seed() {
	const db = database.db;
	const ctx = { db, baseUrl: 'http://test', skipEmailVerification: true };
	const person = (email: string, firstName: string) =>
		register(ctx, {
			email,
			password: 'password 1234',
			firstName,
			lastName: 'Test',
			phone: '1',
			locale: 'de'
		});
	const anna = await person('anna@x.org', 'Anna');
	const ben = await person('ben@x.org', 'Ben');
	const input = {
		firstName: 'Anna',
		lastName: 'Test',
		email: 'anna@x.org',
		phone: '1',
		locale: 'de' as const
	};
	return { db, ctx, anna, ben, input };
}

describe('updateAccount', () => {
	it('changes name, phone and language and logs which fields changed, not the values', async () => {
		const s = await seed();
		await updateAccount(s.db, admin, s.anna.id, {
			...s.input,
			lastName: 'Neu',
			phone: '+49 151 1234',
			locale: 'en'
		});
		const [after] = await s.db.select().from(users).where(eq(users.id, s.anna.id));
		expect([after.lastName, after.phone, after.locale]).toEqual(['Neu', '+49 151 1234', 'en']);
		const [entry] = await s.db.select().from(auditLog).where(eq(auditLog.action, 'user.update'));
		expect(entry.data).toEqual({ fields: ['lastName', 'phone', 'locale'] });
		expect(JSON.stringify(entry.data)).not.toContain('Neu');
	});

	it('logs nothing when nothing changed', async () => {
		const s = await seed();
		await updateAccount(s.db, admin, s.anna.id, s.input);
		expect(await s.db.select().from(auditLog).where(eq(auditLog.action, 'user.update'))).toEqual(
			[]
		);
	});

	it('moves the account to a new address: confirmed, old links void, old address told', async () => {
		const s = await seed();
		await s.db.update(users).set({ emailVerifiedAt: null }).where(eq(users.id, s.anna.id));
		await requestPasswordReset(s.ctx, 'anna@x.org');
		expect(
			await s.db.select().from(emailTokens).where(eq(emailTokens.userId, s.anna.id))
		).toHaveLength(1);
		await s.db.delete(emailOutbox);

		await updateAccount(s.db, admin, s.anna.id, { ...s.input, email: ' Anna.Neu@X.org ' });
		const [after] = await s.db.select().from(users).where(eq(users.id, s.anna.id));
		expect(after.email).toBe('anna.neu@x.org');
		expect(after.emailVerifiedAt).not.toBeNull();
		expect(await s.db.select().from(emailTokens).where(eq(emailTokens.userId, s.anna.id))).toEqual(
			[]
		);
		const mails = await s.db.select().from(emailOutbox);
		expect(mails.map((m) => m.to)).toEqual(['anna@x.org']);
	});

	it('refuses an address that is taken or reserved for deleted accounts', async () => {
		const s = await seed();
		await expectDomainError(
			updateAccount(s.db, admin, s.anna.id, { ...s.input, email: 'BEN@x.org' }),
			'emailTaken'
		);
		await expectDomainError(
			updateAccount(s.db, admin, s.anna.id, { ...s.input, email: 'deleted-1@deleted.invalid' }),
			'invalidEmail'
		);
		const [after] = await s.db.select().from(users).where(eq(users.id, s.anna.id));
		expect(after.email).toBe('anna@x.org');
	});

	it('does not touch deleted accounts', async () => {
		const s = await seed();
		await s.db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, s.anna.id));
		await expectDomainError(
			updateAccount(s.db, admin, s.anna.id, { ...s.input, firstName: 'X' }),
			'notFound'
		);
	});
});
