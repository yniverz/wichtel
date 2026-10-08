import { describe, expect, it } from 'vitest';
import { bodyLimitFor, bodyTooLarge } from './body-limit.ts';

const post = (length: number) =>
	new Request('http://x/', { method: 'POST', headers: { 'content-length': String(length) } });

describe('body limit', () => {
	it('allows uploads only where files are expected', () => {
		expect(bodyLimitFor('/app/qualifications')).toBe(16 * 1024 * 1024);
		expect(bodyLimitFor('/login')).toBe(1024 * 1024);
		expect(bodyLimitFor('/mcp')).toBe(256 * 1024);
		expect(bodyLimitFor(null)).toBe(1024 * 1024);
	});

	it('checks the declared length', () => {
		expect(bodyTooLarge(post(2 * 1024 * 1024), '/login')).toBe(true);
		expect(bodyTooLarge(post(2 * 1024 * 1024), '/admin/settings')).toBe(false);
		expect(bodyTooLarge(new Request('http://x/'), '/login')).toBe(false);
	});
});
