import { fail, redirect } from '@sveltejs/kit';
import { accountContext, db } from '#lib/server/app.ts';
import { actorOf, requireUser } from '#lib/server/guards.ts';
import { mailLimiter } from '#lib/server/limits.ts';
import { sendVerificationEmail, verifyEmail } from '#lib/server/services/accounts.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (token) {
		const user = await verifyEmail(db(), token);
		// Load the page again: the session data of this request still says "not confirmed", and
		// the next pages would keep showing that until a full reload.
		redirect(303, `/verify-email?status=${user ? 'ok' : 'invalid'}`);
	}
	return { verified: url.searchParams.get('status') === 'ok' };
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
