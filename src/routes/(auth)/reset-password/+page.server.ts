import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { attempt } from '#lib/server/guards.ts';
import { isResetTokenValid, resetPassword } from '#lib/server/services/accounts.ts';
import { parseForm, password } from '#lib/server/validation.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token') ?? '';
	return { token, valid: token !== '' && (await isResetTokenValid(db(), token)) };
};

const schema = z.object({ token: z.string().min(1, 'error.invalidToken'), password });

export const actions: Actions = {
	default: async (event) => {
		const parsed = parseForm(schema, await event.request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors });
		const result = await attempt(() =>
			resetPassword(db(), parsed.data.token, parsed.data.password)
		);
		if (!result.ok) return result.failure;
		redirect(303, '/login?notice=reset');
	}
};
