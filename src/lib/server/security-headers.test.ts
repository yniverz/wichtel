import { describe, expect, it } from 'vitest';
import { extendCsp, redirectSources, tileSource } from './security-headers.ts';

describe('security headers', () => {
	it('derives the tile source', () => {
		expect(tileSource('https://tile.openstreetmap.org/{z}/{x}/{y}.png')).toBe(
			'https://tile.openstreetmap.org'
		);
		expect(tileSource('https://{s}.tile.example.org/{z}/{x}/{y}.png')).toBe(
			'https://*.tile.example.org'
		);
		expect(tileSource('https://tiles-{s}.example.org/{z}/{x}/{y}.png')).toBe('https:');
		expect(tileSource('http://insecure.example/{z}')).toBeNull();
	});

	it('adds sources to existing directives', () => {
		expect(
			extendCsp("default-src 'self'; img-src 'self' data:; form-action 'self'", {
				'img-src': ['https://tile.example.org', 'data:'],
				'form-action': redirectSources(['claude.ai']).slice(0, 2)
			})
		).toBe(
			"default-src 'self'; img-src 'self' data: https://tile.example.org; form-action 'self' https://claude.ai https://*.claude.ai"
		);
	});
});
