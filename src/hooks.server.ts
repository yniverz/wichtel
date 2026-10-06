import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';
import { db, initApp } from '#lib/server/app.ts';
import { SESSION_COOKIE, validateSession } from '#lib/server/sessions.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { isLocale, negotiateLocale } from '#lib/i18n/index.ts';
import { LOCALE_COOKIE, setSessionCookie } from '#lib/server/cookies.ts';

export const init: ServerInit = async () => {
	await initApp();
};

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.sessionId = null;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const result = await validateSession(db(), token);
		if (result) {
			event.locals.user = result.user;
			event.locals.sessionId = result.session.id;
			setSessionCookie(event, token, result.session.expiresAt);
		} else {
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		}
	}

	const settings = await getSettings(db());
	const cookieLocale = event.cookies.get(LOCALE_COOKIE);
	event.locals.locale =
		event.locals.user?.locale ??
		(isLocale(cookieLocale)
			? cookieLocale
			: negotiateLocale(event.request.headers.get('accept-language'), settings.defaultLocale));

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
	});

	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('x-frame-options', 'DENY');
	return response;
};

export const handleError: HandleServerError = ({ kind, error }) => {
	// Expected errors (`error(403, 'error.forbidden')`) and framework errors (404 …) keep their message.
	if (kind !== 'unknown') return;
	console.error(error);
	return { message: dev && error instanceof Error ? error.message : 'error.generic' };
};
