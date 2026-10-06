import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { checkbox, email, optionalUuid, parseForm } from './validation.ts';

const form = (entries: Record<string, string | string[]>) => {
	const fd = new FormData();
	for (const [k, v] of Object.entries(entries)) for (const x of [v].flat()) fd.append(k, x);
	return fd;
};

describe('parseForm', () => {
	it('treats missing checkboxes as unchecked', () => {
		const schema = z.object({ flag: checkbox });
		expect(parseForm(schema, form({}))).toMatchObject({ ok: true, data: { flag: false } });
		expect(parseForm(schema, form({ flag: 'on' }))).toMatchObject({
			ok: true,
			data: { flag: true }
		});
	});

	it('returns translated error keys and echoes values without passwords', () => {
		const schema = z.object({ email, password: z.string().min(10, 'error.passwordTooShort') });
		const result = parseForm(schema, form({ email: 'nope', password: 'short' }));
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.errors).toEqual({
			email: 'error.invalidEmail',
			password: 'error.passwordTooShort'
		});
		expect(result.values).toEqual({ email: 'nope' });
	});

	it('collects repeated [] fields as arrays and empty ids as null', () => {
		const schema = z.object({ 'tags[]': z.array(z.string()), parent: optionalUuid });
		const result = parseForm(schema, form({ 'tags[]': ['a', 'b'], parent: '' }));
		expect(result).toMatchObject({ ok: true, data: { 'tags[]': ['a', 'b'], parent: null } });
	});
});
