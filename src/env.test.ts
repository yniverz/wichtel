import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicUrl, setupToken as schema } from './env.ts';

describe('SETUP_TOKEN', () => {
	afterEach(() => vi.unstubAllEnvs());

	it('may be empty (a random token is used) or long enough', () => {
		vi.stubEnv('NODE_ENV', 'production');
		expect(schema('')).toBeUndefined();
		expect(schema('x'.repeat(24))).toBe('x'.repeat(24));
	});

	it('refuses short tokens in production only', () => {
		vi.stubEnv('NODE_ENV', 'production');
		expect(() => schema('admin123')).toThrow(/at least 24/);
		vi.stubEnv('NODE_ENV', 'development');
		expect(schema('admin123')).toBe('admin123');
	});
});

describe('PUBLIC_URL', () => {
	it('keeps scheme, host and port, without trailing slashes', () => {
		expect(publicUrl('https://helfen.example.de/')).toBe('https://helfen.example.de');
		expect(publicUrl(' http://192.168.1.10:3006 ')).toBe('http://192.168.1.10:3006');
		expect(publicUrl('https://Helfen.Example.de:443')).toBe('https://helfen.example.de');
		expect(publicUrl('')).toBe('http://localhost:5173');
		expect(publicUrl(undefined)).toBe('http://localhost:5173');
	});

	it('refuses values that are not an absolute http(s) URL', () => {
		expect(() => publicUrl('helfen.example.de')).toThrow(/absolute URL/);
		expect(() => publicUrl('ftp://helfen.example.de')).toThrow(/https:\/\/ or http:\/\//);
	});

	it('refuses a path, query or credentials (the app runs at the root)', () => {
		expect(() => publicUrl('https://example.de/helfen')).toThrow(/must not contain a path/);
		expect(() => publicUrl('https://example.de/?x=1')).toThrow(/must not contain a path/);
		expect(() => publicUrl('https://user:pw@example.de')).toThrow(/must not contain a path/);
	});
});
