import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';
import { db, initApp, maybeDb } from '#lib/server/app.ts';
import { newErrorId, reportError } from '#lib/server/alerts.ts';
import { log } from '#lib/server/log.ts';
import { touchLastSeen } from '#lib/server/services/privacy.ts';
import { SESSION_COOKIE, validateSession } from '#lib/server/sessions.ts';
import { getSettings } from '#lib/server/services/settings.ts';
import { isLocale, negotiateLocale } from '#lib/i18n/index.ts';
import { LOCALE_COOKIE, setSessionCookie } from '#lib/server/cookies.ts';
import { isCrossSiteForm } from '#lib/server/csrf.ts';

export const init: ServerInit = async () => {
	await initApp();
};

/** Requests that are not worth a log line. */
const quiet = (path: string) =>
	path === '/healthz' || path.startsWith('/_app/') || path.startsWith('/assets/');

export const handle: Handle = async ({ event, resolve }) => {
	const started = performance.now();
	if (!dev && isCrossSiteForm(event.request, event.url)) {
		return new Response(`Cross-site ${event.request.method} form submissions are forbidden`, {
			status: 403
		});
	}
	event.locals.user = null;
	event.locals.sessionId = null;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const result = await validateSession(db(), token);
		if (result) {
			event.locals.user = result.user;
			event.locals.sessionId = result.session.id;
			setSessionCookie(event, token, result.session.expiresAt);
			await touchLastSeen(db(), result.user);
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
	if (!quiet(event.url.pathname)) {
		// Path only: query strings can carry tokens.
		log.info('request', {
			method: event.request.method,
			path: event.route.id ?? event.url.pathname,
			status: response.status,
			ms: Math.round(performance.now() - started)
		});
	}
	return response;
};

export const handleError: HandleServerError = async ({ kind, error, event }) => {
	// Expected errors (`error(403, 'error.forbidden')`) and framework errors (404 …) keep their message.
	if (kind !== 'unknown') return;
	const errorId = newErrorId();
	await reportError(maybeDb(), error, {
		errorId,
		method: event.request.method,
		path: event.route.id ?? event.url.pathname
	});
	return { message: dev && error instanceof Error ? error.message : 'error.generic', errorId };
};
