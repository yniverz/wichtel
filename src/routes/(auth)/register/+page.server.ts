import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { accountContext, db } from '#lib/server/app.ts';
import { setSessionCookie } from '#lib/server/cookies.ts';
import { actorOf, attempt } from '#lib/server/guards.ts';
import { registerLimiter } from '#lib/server/limits.ts';
import { createSession } from '#lib/server/sessions.ts';
import { register } from '#lib/server/services/accounts.ts';
import { email, parseForm, password, phone, requiredText } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/app');
};

const schema = z.object({
	firstName: requiredText(100),
	lastName: requiredText(100),
	email,
	phone,
	password
});

export const actions: Actions = {
	default: async (event) => {
		const parsed = parseForm(schema, await event.request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });

		if (!registerLimiter.attempt(actorOf(event).ip ?? 'unknown')) {
			return fail(429, { error: 'error.rateLimited', values: parsed.values });
		}

		const input = { ...parsed.data, locale: event.locals.locale };
		const { password: _password, ...values } = parsed.data;
		void _password;
		const result = await attempt(() => register(accountContext(), input), { values });
		if (!result.ok) return result.failure;

		const session = await createSession(db(), result.value.id);
		setSessionCookie(event, session.token, session.expiresAt);
		redirect(303, '/app');
	}
};
