/** Validation of configurable profile field values. Pure – used on server and client. */

export type FieldType =
	'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';
export type FieldValue = string | number | boolean | string[];

export interface FieldDefinition {
	id: string;
	type: FieldType;
	options: readonly string[];
	required: boolean;
}

export type FieldError =
	| 'error.required'
	| 'error.invalidNumber'
	| 'error.invalidDate'
	| 'error.tooLong'
	| 'error.invalidOption';

export type ParsedField = { ok: true; value: FieldValue | null } | { ok: false; error: FieldError };

/**
 * Turns raw form input (strings from FormData) into a typed value. `null` means "no answer",
 * which is an error for required fields.
 */
export function parseFieldValue(field: FieldDefinition, raw: string[]): ParsedField {
	const first = (raw[0] ?? '').trim();
	const missing = (): ParsedField =>
		field.required ? { ok: false, error: 'error.required' } : { ok: true, value: null };

	switch (field.type) {
		case 'checkbox': {
			const checked = first === 'on' || first === 'true';
			if (field.required && !checked) return { ok: false, error: 'error.required' };
			return { ok: true, value: checked };
		}
		case 'number': {
			if (first === '') return missing();
			const n = Number(first.replace(',', '.'));
			return Number.isFinite(n)
				? { ok: true, value: n }
				: { ok: false, error: 'error.invalidNumber' };
		}
		case 'date': {
			if (first === '') return missing();
			return /^\d{4}-\d{2}-\d{2}$/.test(first) && !Number.isNaN(Date.parse(first))
				? { ok: true, value: first }
				: { ok: false, error: 'error.invalidDate' };
		}
		case 'select': {
			if (first === '') return missing();
			return field.options.includes(first)
				? { ok: true, value: first }
				: { ok: false, error: 'error.invalidOption' };
		}
		case 'multiselect': {
			const chosen = [...new Set(raw.map((v) => v.trim()).filter(Boolean))];
			if (chosen.length === 0) return missing();
			return chosen.every((v) => field.options.includes(v))
				? { ok: true, value: chosen }
				: { ok: false, error: 'error.invalidOption' };
		}
		default: {
			if (first === '') return missing();
			const max = field.type === 'textarea' ? 2000 : 200;
			return first.length > max
				? { ok: false, error: 'error.tooLong' }
				: { ok: true, value: first };
		}
	}
}

/** Whether a stored value counts as an answer. */
export function hasValue(value: FieldValue | null | undefined): boolean {
	if (value === null || value === undefined) return false;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === 'string') return value.trim() !== '';
	return true;
}

/** Human-readable form of a value, e.g. for rosters and the desk. */
export function displayValue(
	value: FieldValue | null | undefined,
	yes: string,
	no: string
): string {
	if (value === null || value === undefined) return '';
	if (Array.isArray(value)) return value.join(', ');
	if (typeof value === 'boolean') return value ? yes : no;
	return String(value);
}
