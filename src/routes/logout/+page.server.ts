import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { clearSessionCookie } from '#lib/server/cookies.ts';
import { invalidateSession } from '#lib/server/sessions.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async (event) => {
		if (event.locals.sessionId) await invalidateSession(db(), event.locals.sessionId);
		clearSessionCookie(event);
		redirect(303, '/');
	}
};
