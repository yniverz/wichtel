import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { safeRedirectTarget, setSessionCookie } from '#lib/server/cookies.ts';
import { actorOf, attempt } from '#lib/server/guards.ts';
import { loginGuard } from '#lib/server/limits.ts';
import { createSession } from '#lib/server/sessions.ts';
import { authenticate } from '#lib/server/services/accounts.ts';
import { email, parseForm } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(303, safeRedirectTarget(url.searchParams.get('next')));
};

const schema = z.object({ email, password: z.string().min(1, 'error.required') });

export const actions: Actions = {
	default: async (event) => {
		const parsed = parseForm(schema, await event.request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });
		const { data } = parsed;

		const ip = actorOf(event).ip ?? null;
		if (!loginGuard.allows(ip, data.email)) {
			return fail(429, { error: 'error.rateLimited', values: { email: data.email } });
		}

		const result = await attempt(() => authenticate(db(), data.email, data.password), {
			values: { email: data.email }
		});
		if (!result.ok) {
			loginGuard.failed(ip, data.email);
			return result.failure;
		}

		loginGuard.succeeded(ip, data.email);
		const session = await createSession(db(), result.value.id);
		setSessionCookie(event, session.token, session.expiresAt);
		redirect(303, safeRedirectTarget(event.url.searchParams.get('next')));
	}
};
