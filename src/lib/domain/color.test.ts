import { describe, expect, it } from 'vitest';
import { contrastRatio, isHexColor, normalizeHex, readableTextColor } from './color.ts';

describe('color', () => {
	it('validates and normalizes hex colors', () => {
		expect(isHexColor('#abc')).toBe(true);
		expect(isHexColor('#abcdef')).toBe(true);
		expect(isHexColor('abcdef')).toBe(false);
		expect(isHexColor('#abcd')).toBe(false);
		expect(normalizeHex('#ABC')).toBe('#aabbcc');
	});

	it('computes WCAG contrast', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
		expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
	});

	it('picks readable text colors', () => {
		expect(readableTextColor('#c03a1c')).toBe('#ffffff');
		expect(readableTextColor('#f4c430')).toBe('#1d1b17');
	});
});
