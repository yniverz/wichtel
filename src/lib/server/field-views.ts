import type { ProfileField } from './db/schema.ts';

/** The parts of a field definition the browser needs to render it. */
export function fieldView(f: ProfileField) {
	return {
		id: f.id,
		labelDe: f.labelDe,
		labelEn: f.labelEn,
		helpDe: f.helpDe,
		helpEn: f.helpEn,
		type: f.type,
		options: f.options,
		required: f.required
	};
}
