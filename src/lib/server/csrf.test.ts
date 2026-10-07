import { describe, expect, it } from 'vitest';
import { isCrossSiteForm } from './csrf.ts';

const url = new URL('https://helfen.example.de/login');
const post = (headers: Record<string, string>, target = url) =>
	isCrossSiteForm(new Request(target, { method: 'POST', headers }), target);

describe('isCrossSiteForm', () => {
	it('blocks form posts from other or missing origins', () => {
		const form = { 'content-type': 'application/x-www-form-urlencoded' };
		expect(post({ ...form, origin: 'https://evil.example' })).toBe(true);
		expect(post(form)).toBe(true);
		expect(post({ ...form, origin: 'https://helfen.example.de' })).toBe(false);
	});
	it('lets OAuth and MCP endpoints through', () => {
		const form = { 'content-type': 'application/x-www-form-urlencoded' };
		expect(post(form, new URL('https://helfen.example.de/oauth/token'))).toBe(false);
		expect(post({ origin: 'https://claude.ai' }, new URL('https://helfen.example.de/mcp'))).toBe(
			false
		);
	});
	it('ignores JSON and reading requests', () => {
		expect(post({ 'content-type': 'application/json', origin: 'https://evil.example' })).toBe(
			false
		);
		expect(isCrossSiteForm(new Request(url), url)).toBe(false);
	});
});
