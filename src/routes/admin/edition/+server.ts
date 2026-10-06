import { redirect } from '@sveltejs/kit';
import { ADMIN_EDITION_COOKIE, safeRedirectTarget } from '#lib/server/cookies.ts';
import { requireVerifiedUser } from '#lib/server/guards.ts';
import type { RequestHandler } from './$types';

/** Switches the edition shown in the admin area (stored per browser). */
export const POST: RequestHandler = async (event) => {
	requireVerifiedUser(event);
	const form = await event.request.formData();
	const id = form.get('edition')?.toString() ?? '';
	if (/^[0-9a-f-]{36}$/i.test(id)) {
		event.cookies.set(ADMIN_EDITION_COOKIE, id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: event.url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 180
		});
	}
	redirect(303, safeRedirectTarget(form.get('next')?.toString(), '/admin'));
};
