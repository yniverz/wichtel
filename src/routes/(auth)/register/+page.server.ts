import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { accountContext, db } from '#lib/server/app.ts';
import { setSessionCookie } from '#lib/server/cookies.ts';
import { fieldView } from '#lib/server/field-views.ts';
import { actorOf, attempt } from '#lib/server/guards.ts';
import { registerLimiter } from '#lib/server/limits.ts';
import { createSession } from '#lib/server/sessions.ts';
import { register } from '#lib/server/services/accounts.ts';
import {
	fieldsFor,
	listFields,
	readFieldInput,
	saveValues,
	validateFields
} from '#lib/server/services/fields.ts';
import { email, parseForm, password, phone, requiredText } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/app');
	return { fields: fieldsFor(await listFields(db()), 'registration').map(fieldView) };
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
		const form = await event.request.formData();
		const fields = fieldsFor(await listFields(db()), 'registration');
		const fieldInput = readFieldInput(form, fields);
		const fieldValues = Object.fromEntries(
			Object.entries(fieldInput).map(([k, v]) => [k, v.length > 1 ? v : (v[0] ?? '')])
		);
		const parsed = parseForm(schema, form);
		const checked = validateFields(fields, fieldInput);
		if (!parsed.ok || !checked.ok) {
			return fail(400, {
				errors: { ...(parsed.ok ? {} : parsed.errors), ...checked.errors },
				values: parsed.values,
				fieldValues
			});
		}

		if (!registerLimiter.attempt(actorOf(event).ip ?? 'unknown')) {
			return fail(429, { error: 'error.rateLimited', values: parsed.values, fieldValues });
		}

		const input = { ...parsed.data, locale: event.locals.locale };
		const { password: _password, ...values } = parsed.data;
		void _password;
		const result = await attempt(() => register(accountContext(), input), { values });
		if (!result.ok)
			return {
				...result.failure,
				data: { ...result.failure.data, fieldValues }
			} as typeof result.failure;
		await saveValues(db(), result.value.id, checked.values);

		const session = await createSession(db(), result.value.id);
		setSessionCookie(event, session.token, session.expiresAt);
		redirect(303, '/app');
	}
};
