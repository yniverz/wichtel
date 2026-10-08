import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupToken as schema } from './env.ts';

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
