import type { RequestEvent } from '@sveltejs/kit';
import { SESSION_COOKIE } from './sessions.ts';

export const LOCALE_COOKIE = 'wichtel_locale';
export const ADMIN_EDITION_COOKIE = 'wichtel_admin_edition';

export function setSessionCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: event.url.protocol === 'https:',
		expires: expiresAt
	});
}

export function clearSessionCookie(event: RequestEvent): void {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Only allows same-site relative paths as redirect targets (prevents open redirects). */
export function safeRedirectTarget(value: string | null | undefined, fallback = '/app'): string {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
		return fallback;
	}
	return value;
}
