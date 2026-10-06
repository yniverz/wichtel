import { z } from 'zod';
import { isHexColor, normalizeHex } from '#lib/domain/color.ts';
import { isMessageKey, type MessageKey } from '#lib/i18n/index.ts';

/**
 * Zod helpers whose error messages are i18n message keys, so the UI can show them translated.
 */

export const requiredText = (max = 200) =>
	z.string().trim().min(1, 'error.required').max(max, 'error.tooLong');

export const optionalText = (max = 2000) => z.string().trim().max(max, 'error.tooLong').default('');

export const email = z
	.string()
	.trim()
	.toLowerCase()
	.min(1, 'error.required')
	.max(254, 'error.tooLong')
	.pipe(z.email('error.invalidEmail'));

export const password = z
	.string()
	.min(10, 'error.passwordTooShort')
	.max(256, 'error.passwordTooLong');

export const phone = z
	.string()
	.trim()
	.min(1, 'error.required')
	.regex(/^\+?[0-9 ()/-]{5,25}$/, 'error.invalidPhone');

export const hexColor = z
	.string()
	.trim()
	.refine(isHexColor, 'error.invalidColor')
	.transform(normalizeHex);

export const optionalUrl = z
	.string()
	.trim()
	.max(500, 'error.tooLong')
	.refine((v) => v === '' || /^https?:\/\/\S+$/.test(v), 'error.invalidUrl')
	.default('');

export const optionalEmail = z
	.string()
	.trim()
	.toLowerCase()
	.refine((v) => v === '' || z.email().safeParse(v).success, 'error.invalidEmail')
	.default('');

export const isoDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'error.invalidDate')
	.refine((v) => !Number.isNaN(Date.parse(v)), 'error.invalidDate');

export const uuid = z.uuid('error.notFound');
export const optionalUuid = z
	.string()
	.trim()
	.transform((v) => (v === '' ? null : v))
	.pipe(z.uuid('error.notFound').nullable());

export const checkbox = z
	.union([z.literal('on'), z.literal('true'), z.literal(''), z.undefined()])
	.transform((v) => v === 'on' || v === 'true');

export type FieldErrors = Record<string, MessageKey>;

export type ParseResult<T> =
	| { ok: true; data: T; values: Record<string, string> }
	| { ok: false; data?: undefined; errors: FieldErrors; values: Record<string, string> };

/** Converts FormData into a plain object (repeated keys become arrays) and validates it. */
export function parseForm<S extends z.ZodType>(
	schema: S,
	form: FormData
): ParseResult<z.output<S>> {
	const raw: Record<string, unknown> = {};
	for (const key of new Set(form.keys())) {
		const all = form.getAll(key).filter((v): v is string => typeof v === 'string');
		raw[key] = key.endsWith('[]') ? all : all[0];
	}
	// Echo back values for re-rendering, but never passwords.
	const values: Record<string, string> = {};
	for (const [k, v] of Object.entries(raw)) {
		if (typeof v === 'string' && !/password/i.test(k)) values[k] = v;
	}

	const result = schema.safeParse(raw);
	if (result.success) return { ok: true, data: result.data, values };

	const errors: FieldErrors = {};
	for (const issue of result.error.issues) {
		const field = String(issue.path[0] ?? '_');
		if (errors[field]) continue;
		errors[field] = isMessageKey(issue.message) ? issue.message : 'error.required';
	}
	return { ok: false, errors, values };
}
