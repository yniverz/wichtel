import { afterEach, describe, expect, it } from 'vitest';
import { safeRedirectTarget, secureCookie, setHttpsOnly } from './cookies.ts';

describe('safeRedirectTarget', () => {
	it('keeps paths on this site', () => {
		expect(safeRedirectTarget('/app/shifts?day=2027-06-01#top')).toBe(
			'/app/shifts?day=2027-06-01#top'
		);
		expect(safeRedirectTarget('/admin/../app')).toBe('/app');
	});

	it.each([
		'//evil.example',
		'/\\evil.example',
		'/\t/evil.example',
		'/\n/evil.example',
		'/\r/evil.example',
		'\\/evil.example',
		'https://evil.example',
		'javascript:alert(1)',
		'evil.example',
		'',
		null
	])('refuses %j', (target) => {
		expect(safeRedirectTarget(target, '/fallback')).toBe('/fallback');
	});
});

describe('secureCookie', () => {
	afterEach(() => setHttpsOnly(false));

	it('follows the request protocol unless the public URL is https', () => {
		const http = { url: new URL('http://helfen.example.de/') };
		expect(secureCookie(http)).toBe(false);
		expect(secureCookie({ url: new URL('https://helfen.example.de/') })).toBe(true);
		setHttpsOnly(true);
		expect(secureCookie(http)).toBe(true);
	});
});
