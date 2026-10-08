import type { RequestEvent } from '@sveltejs/kit';
import { SESSION_COOKIE } from './sessions.ts';

export const LOCALE_COOKIE = 'wichtel_locale';
export const ADMIN_EDITION_COOKIE = 'wichtel_admin_edition';

/** Set at startup: with an https `PUBLIC_URL`, cookies are always `Secure`. */
let httpsOnly = false;
export function setHttpsOnly(value: boolean) {
	httpsOnly = value;
}

/**
 * Whether cookies get the `Secure` flag. Not left to the proxy alone: if it forgets
 * `X-Forwarded-Proto`, the session cookie would otherwise also travel over plain http.
 */
export function secureCookie(event: Pick<RequestEvent, 'url'>): boolean {
	return httpsOnly || event.url.protocol === 'https:';
}

export function setSessionCookie(event: RequestEvent, token: string, expiresAt: Date): void {
	event.cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: secureCookie(event),
		expires: expiresAt
	});
}

export function clearSessionCookie(event: RequestEvent): void {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}

const PROBE = 'http://wichtel.invalid';

/**
 * Only allows paths on this site as redirect targets (prevents open redirects). Browsers drop
 * tabs and line breaks and read `\` as `/`, so such targets are refused outright; the rest is
 * resolved like a browser would and must stay on the same origin.
 */
export function safeRedirectTarget(value: string | null | undefined, fallback = '/app'): string {
	// eslint-disable-next-line no-control-regex
	if (!value || !value.startsWith('/') || /[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
	try {
		const url = new URL(value, PROBE);
		if (url.origin !== PROBE) return fallback;
		return url.pathname + url.search + url.hash;
	} catch {
		return fallback;
	}
}
