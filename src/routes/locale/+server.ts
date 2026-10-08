import { redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { LOCALE_COOKIE, safeRedirectTarget, secureCookie } from '#lib/server/cookies.ts';
import { setLocale } from '#lib/server/services/accounts.ts';
import { isLocale } from '#lib/i18n/index.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, locals, url }) => {
	const form = await request.formData();
	const locale = form.get('locale');
	if (isLocale(locale)) {
		cookies.set(LOCALE_COOKIE, locale, {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			sameSite: 'lax',
			httpOnly: false,
			secure: secureCookie({ url })
		});
		if (locals.user) await setLocale(db(), locals.user.id, locale);
	}
	redirect(303, safeRedirectTarget(form.get('next')?.toString(), '/'));
};
