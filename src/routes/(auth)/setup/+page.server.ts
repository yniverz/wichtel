import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { setSessionCookie } from '#lib/server/cookies.ts';
import { attempt } from '#lib/server/guards.ts';
import { createSession } from '#lib/server/sessions.ts';
import { checkSetupToken, completeSetup, isSetupComplete } from '#lib/server/services/setup.ts';
import {
	email,
	isoDate,
	parseForm,
	password,
	phone,
	requiredText
} from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	if (await isSetupComplete(db())) redirect(303, '/login');
	const token = url.searchParams.get('token') ?? '';
	return { token, valid: await checkSetupToken(db(), token) };
};

const schema = z.object({
	token: z.string(),
	festivalName: requiredText(100),
	firstName: requiredText(100),
	lastName: requiredText(100),
	email,
	phone,
	password,
	editionName: requiredText(100),
	startsOn: isoDate,
	endsOn: isoDate
});

export const actions: Actions = {
	default: async (event) => {
		const parsed = parseForm(schema, await event.request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });
		const { password: _pw, ...values } = parsed.data;
		void _pw;
		const result = await attempt(
			() => completeSetup(db(), { ...parsed.data, locale: event.locals.locale }),
			{ values }
		);
		if (!result.ok) return result.failure;
		const session = await createSession(db(), result.value.id);
		setSessionCookie(event, session.token, session.expiresAt);
		redirect(303, '/admin');
	}
};
