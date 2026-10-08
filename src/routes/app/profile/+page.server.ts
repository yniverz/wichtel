import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { config, db } from '#lib/server/app.ts';
import { users } from '#lib/server/db/schema.ts';
import { clearSessionCookie, setSessionCookie } from '#lib/server/cookies.ts';
import { deleteOwnAccount } from '#lib/server/services/privacy.ts';
import { attempt, requireUser } from '#lib/server/guards.ts';
import { createSession } from '#lib/server/sessions.ts';
import { changePassword, updateProfile } from '#lib/server/services/accounts.ts';
import { parseForm, password, phone, requiredText } from '#lib/server/validation.ts';
import { LOCALES } from '#lib/i18n/index.ts';
import { fieldView } from '#lib/server/field-views.ts';
import {
	fieldsFor,
	listFields,
	readFieldInput,
	saveValues,
	validateFields,
	valuesOf
} from '#lib/server/services/fields.ts';
import { canUseMcp } from '#lib/server/mcp/access.ts';
import { listConnections, revokeConnection } from '#lib/server/services/oauth.ts';
import { uuid } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const mcp = (await canUseMcp(db(), user))
		? {
				url: `${config.publicUrl}/mcp`,
				connections: (await listConnections(db(), user.id)).map((c) => ({
					id: c.id,
					clientName: c.clientName,
					scope: c.scope,
					createdAt: c.createdAt.toISOString(),
					lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
					expiresAt: c.expiresAt.toISOString()
				}))
			}
		: null;
	return {
		mcp,
		profile: {
			firstName: user.firstName,
			lastName: user.lastName,
			phone: user.phone,
			locale: user.locale
		},
		calendarUrl: `${config.publicUrl}/calendar/${user.calendarToken}.ics`,
		fields: fieldsFor(await listFields(db()), 'profile').map(fieldView),
		fieldValues: await valuesOf(db(), user.id)
	};
};

const profileSchema = z.object({
	firstName: requiredText(100),
	lastName: requiredText(100),
	phone,
	locale: z.enum(LOCALES)
});

const passwordSchema = z.object({
	currentPassword: z.string().min(1, 'error.required'),
	newPassword: password
});

export const actions: Actions = {
	profile: async (event) => {
		const user = requireUser(event);
		const parsed = parseForm(profileSchema, await event.request.formData());
		if (!parsed.ok)
			return fail(400, { action: 'profile', errors: parsed.errors, values: parsed.values });
		await updateProfile(db(), user.id, parsed.data);
		return { action: 'profile', success: 'common.saved' };
	},
	password: async (event) => {
		const user = requireUser(event);
		const parsed = parseForm(passwordSchema, await event.request.formData());
		if (!parsed.ok) return fail(400, { action: 'password', errors: parsed.errors });
		const result = await attempt(
			() => changePassword(db(), user, parsed.data.currentPassword, parsed.data.newPassword),
			{ action: 'password' }
		);
		if (!result.ok) return result.failure;
		// All sessions were revoked – keep this device signed in with a fresh session.
		const session = await createSession(db(), user.id);
		setSessionCookie(event, session.token, session.expiresAt);
		return { action: 'password', success: 'profile.passwordChanged' };
	},
	disconnect: async (event) => {
		const user = requireUser(event);
		const parsed = parseForm(z.object({ id: uuid }), await event.request.formData());
		if (!parsed.ok) return fail(400, { action: 'mcp', error: 'error.notFound' });
		await revokeConnection(db(), user.id, parsed.data.id);
		return { action: 'mcp', success: 'mcp.disconnected' };
	},
	rotateCalendar: async (event) => {
		const user = requireUser(event);
		await db()
			.update(users)
			.set({ calendarToken: sql`replace(gen_random_uuid()::text, '-', '')` })
			.where(eq(users.id, user.id));
		return { action: 'calendar', success: 'common.saved' };
	},
	deleteAccount: async (event) => {
		const user = requireUser(event);
		const parsed = parseForm(
			z.object({ password: z.string().min(1, 'error.required') }),
			await event.request.formData()
		);
		if (!parsed.ok) return fail(400, { action: 'delete', errors: parsed.errors });
		const result = await attempt(
			() => deleteOwnAccount({ db: db(), uploadDir: config.uploadDir }, user, parsed.data.password),
			{ action: 'delete' }
		);
		if (!result.ok) return result.failure;
		clearSessionCookie(event);
		redirect(303, '/login?notice=deleted');
	},
	fields: async (event) => {
		const user = requireUser(event);
		const fields = fieldsFor(await listFields(db()), 'profile');
		const checked = validateFields(fields, readFieldInput(await event.request.formData(), fields));
		if (!checked.ok) return fail(400, { action: 'fields', errors: checked.errors });
		await saveValues(db(), user.id, checked.values);
		return { action: 'fields', success: 'common.saved' };
	}
};
