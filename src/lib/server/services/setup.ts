import { eq } from 'drizzle-orm';
import type { Locale } from '#lib/i18n/index.ts';
import type { DB } from '../db/client.ts';
import { instanceSettings, roles, users, type User } from '../db/schema.ts';
import { hashPassword, randomToken, sha256 } from '../crypto.ts';
import { DomainError } from '../errors.ts';
import { audit } from '../audit.ts';
import { getSettings, invalidateSettingsCache } from './settings.ts';
import { createEdition } from './editions.ts';
import { ROLE_TEMPLATES } from './roles.ts';

export async function isSetupComplete(db: DB): Promise<boolean> {
	const [admin] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.isAdmin, true))
		.limit(1);
	return Boolean(admin);
}

/**
 * Prepares the one-time setup link when no admin exists yet. Returns the token to print, or null
 * if setup is already complete.
 */
export async function prepareSetup(db: DB, fixedToken?: string): Promise<string | null> {
	if (await isSetupComplete(db)) return null;
	await getSettings(db); // ensure the settings row exists
	const token = fixedToken ?? randomToken();
	await db
		.update(instanceSettings)
		.set({ setupTokenHash: sha256(token) })
		.where(eq(instanceSettings.id, 1));
	invalidateSettingsCache();
	return token;
}

export async function checkSetupToken(db: DB, token: string): Promise<boolean> {
	if (!token) return false;
	const settings = await getSettings(db);
	return settings.setupTokenHash !== null && settings.setupTokenHash === sha256(token);
}

export interface SetupInput {
	token: string;
	festivalName: string;
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	password: string;
	locale: Locale;
	editionName: string;
	startsOn: string;
	endsOn: string;
}

export async function completeSetup(db: DB, input: SetupInput): Promise<User> {
	if (await isSetupComplete(db)) throw new DomainError('setupDone');
	if (!(await checkSetupToken(db, input.token))) throw new DomainError('invalidToken');
	if (input.endsOn < input.startsOn) throw new DomainError('invalidDateRange', 'endsOn');

	const passwordHash = await hashPassword(input.password);
	const admin = await db.transaction(async (tx) => {
		const [user] = await tx
			.insert(users)
			.values({
				email: input.email.toLowerCase(),
				passwordHash,
				firstName: input.firstName,
				lastName: input.lastName,
				phone: input.phone,
				locale: input.locale,
				isAdmin: true,
				emailVerifiedAt: new Date()
			})
			.returning();
		await tx
			.update(instanceSettings)
			.set({ festivalName: input.festivalName, defaultLocale: input.locale, setupTokenHash: null })
			.where(eq(instanceSettings.id, 1));
		const existingRoles = await tx.select({ id: roles.id }).from(roles).limit(1);
		if (existingRoles.length === 0) await tx.insert(roles).values(ROLE_TEMPLATES);
		await audit(tx, { userId: user.id }, { action: 'instance.setup', entityType: 'settings' });
		return user;
	});
	invalidateSettingsCache();

	await createEdition(
		db,
		{ userId: admin.id },
		{
			name: input.editionName,
			startsOn: input.startsOn,
			endsOn: input.endsOn
		}
	);
	return admin;
}
