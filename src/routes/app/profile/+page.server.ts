import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { setSessionCookie } from '#lib/server/cookies.ts';
import { attempt, requireUser } from '#lib/server/guards.ts';
import { createSession } from '#lib/server/sessions.ts';
import { changePassword, updateProfile } from '#lib/server/services/accounts.ts';
import { parseForm, password, phone, requiredText } from '#lib/server/validation.ts';
import { LOCALES } from '#lib/i18n/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const user = requireUser(event);
	return {
		profile: {
			firstName: user.firstName,
			lastName: user.lastName,
			phone: user.phone,
			locale: user.locale
		}
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
	}
};
