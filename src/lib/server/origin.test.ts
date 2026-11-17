import { afterEach, describe, expect, it } from 'vitest';
import { configureOrigin, requestUrl } from './origin.ts';
import { isCrossSiteForm } from './csrf.ts';
import { secureCookie } from './cookies.ts';

/** What adapter-node hands over: https unless the protocol header says otherwise. */
const event = (headers: Record<string, string> = {}, url = 'https://192.168.1.10:3006/login') => ({
	url: new URL(url),
	request: new Request(url, { method: 'POST', headers })
});

describe('requestUrl', () => {
	afterEach(() => configureOrigin('https://helfen.example.de', undefined));

	it('uses http for direct access when PUBLIC_URL is http and no proxy header came', () => {
		configureOrigin('http://192.168.1.10:3006', 'x-forwarded-proto');
		expect(requestUrl(event()).origin).toBe('http://192.168.1.10:3006');
		expect(requestUrl(event({}, 'https://localhost:80/')).origin).toBe('http://localhost');
		configureOrigin('http://192.168.1.10:3006', undefined);
		expect(requestUrl(event()).origin).toBe('http://192.168.1.10:3006');
	});

	it('trusts the proxy header when it is there', () => {
		configureOrigin('http://192.168.1.10:3006', 'X-Forwarded-Proto');
		expect(requestUrl(event({ 'x-forwarded-proto': 'https' })).protocol).toBe('https:');
	});

	it('changes nothing with an https PUBLIC_URL', () => {
		configureOrigin('https://helfen.example.de', 'x-forwarded-proto');
		expect(requestUrl(event()).protocol).toBe('https:');
		expect(requestUrl(event({}, 'http://helfen.example.de/')).protocol).toBe('http:');
	});

	it('lets same-origin forms through over plain http, but not cross-site ones', () => {
		configureOrigin('http://192.168.1.10:3006', 'x-forwarded-proto');
		const form = { 'content-type': 'application/x-www-form-urlencoded' };
		const own = event({ ...form, origin: 'http://192.168.1.10:3006' });
		expect(isCrossSiteForm(own.request, requestUrl(own))).toBe(false);
		const evil = event({ ...form, origin: 'http://evil.example' });
		expect(isCrossSiteForm(evil.request, requestUrl(evil))).toBe(true);
		const https = event({ ...form, origin: 'https://192.168.1.10:3006' });
		expect(isCrossSiteForm(https.request, requestUrl(https))).toBe(true);
		expect(secureCookie(own)).toBe(false);
	});
});
