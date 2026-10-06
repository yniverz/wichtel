import { fail } from '@sveltejs/kit';
import { accountContext, db } from '#lib/server/app.ts';
import { actorOf, requireUser } from '#lib/server/guards.ts';
import { mailLimiter } from '#lib/server/limits.ts';
import { sendVerificationEmail, verifyEmail } from '#lib/server/services/accounts.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token') ?? '';
	const user = token ? await verifyEmail(db(), token) : null;
	return { verified: user !== null };
};

export const actions: Actions = {
	resend: async (event) => {
		const user = requireUser(event);
		if (!mailLimiter.attempt(`${actorOf(event).ip}:${user.email}`)) {
			return fail(429, { error: 'error.rateLimited' });
		}
		await sendVerificationEmail(accountContext(), user);
		return { success: 'auth.verifyPending.resent' };
	}
};
