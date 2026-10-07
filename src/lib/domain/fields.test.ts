import { describe, expect, it } from 'vitest';
import { displayValue, hasValue, parseFieldValue, type FieldDefinition } from './fields.ts';

const field = (
	type: FieldDefinition['type'],
	required = false,
	options: string[] = []
): FieldDefinition => ({
	id: 'f',
	type,
	options,
	required
});

describe('profile field values', () => {
	it('parses each type and enforces required answers', () => {
		expect(parseFieldValue(field('text'), [' Hallo '])).toEqual({ ok: true, value: 'Hallo' });
		expect(parseFieldValue(field('text'), [''])).toEqual({ ok: true, value: null });
		expect(parseFieldValue(field('text', true), [''])).toEqual({
			ok: false,
			error: 'error.required'
		});
		expect(parseFieldValue(field('number'), ['3,5'])).toEqual({ ok: true, value: 3.5 });
		expect(parseFieldValue(field('number'), ['drei'])).toEqual({
			ok: false,
			error: 'error.invalidNumber'
		});
		expect(parseFieldValue(field('date'), ['2027-02-30x'])).toEqual({
			ok: false,
			error: 'error.invalidDate'
		});
		expect(parseFieldValue(field('checkbox'), [])).toEqual({ ok: true, value: false });
		expect(parseFieldValue(field('checkbox', true), [])).toEqual({
			ok: false,
			error: 'error.required'
		});
	});

	it('only accepts configured options', () => {
		const size = field('select', true, ['S', 'M', 'L']);
		expect(parseFieldValue(size, ['M'])).toEqual({ ok: true, value: 'M' });
		expect(parseFieldValue(size, ['XXL'])).toEqual({ ok: false, error: 'error.invalidOption' });
		const diet = field('multiselect', false, ['vegan', 'glutenfrei']);
		expect(parseFieldValue(diet, ['vegan', 'vegan', 'glutenfrei'])).toEqual({
			ok: true,
			value: ['vegan', 'glutenfrei']
		});
		expect(parseFieldValue(diet, [])).toEqual({ ok: true, value: null });
	});

	it('displays values', () => {
		expect(hasValue([])).toBe(false);
		expect(hasValue(false)).toBe(true);
		expect(displayValue(['a', 'b'], 'ja', 'nein')).toBe('a, b');
		expect(displayValue(true, 'ja', 'nein')).toBe('ja');
	});
});
