import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { accountContext } from '#lib/server/app.ts';
import { actorOf } from '#lib/server/guards.ts';
import { mailLimiter, mailPerAddressLimiter } from '#lib/server/limits.ts';
import { requestPasswordReset } from '#lib/server/services/accounts.ts';
import { email, parseForm } from '#lib/server/validation.ts';
import type { Actions } from './$types';

const schema = z.object({ email });

export const actions: Actions = {
	default: async (event) => {
		const parsed = parseForm(schema, await event.request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });
		const ip = actorOf(event).ip;
		if (
			(ip && !mailLimiter.attempt(`${ip}:${parsed.data.email}`)) ||
			!mailPerAddressLimiter.attempt(parsed.data.email)
		) {
			return fail(429, { error: 'error.rateLimited', values: parsed.values });
		}
		await requestPasswordReset(accountContext(), parsed.data.email);
		return { sent: true };
	}
};
