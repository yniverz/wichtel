import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { ADMIN_EDITION_COOKIE, safeRedirectTarget, secureCookie } from '#lib/server/cookies.ts';
import { requireVerifiedUser } from '#lib/server/guards.ts';
import { adminEditions } from '#lib/server/services/roles.ts';
import type { RequestHandler } from './$types';

/** Switches the edition shown in the admin area (stored per browser). */
export const POST: RequestHandler = async (event) => {
	const user = requireVerifiedUser(event);
	const form = await event.request.formData();
	const id = form.get('edition')?.toString() ?? '';
	// Only editions the person may open: anything else would lock them out of the admin area.
	if ((await adminEditions(db(), user)).some((e) => e.id === id)) {
		event.cookies.set(ADMIN_EDITION_COOKIE, id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: secureCookie(event),
			maxAge: 60 * 60 * 24 * 180
		});
	}
	redirect(303, safeRedirectTarget(form.get('next')?.toString(), '/admin'));
};
