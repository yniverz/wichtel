import { and, asc, eq, inArray } from 'drizzle-orm';
import { hasValue, parseFieldValue, type FieldValue } from '#lib/domain/fields.ts';
import type { MessageKey } from '#lib/i18n/index.ts';
import type { DB, Tx } from '../db/client.ts';
import { profileFields, profileValues, type ProfileField } from '../db/schema.ts';
import { audit, diff, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';

export type FieldInput = Omit<ProfileField, 'id' | 'createdAt' | 'updatedAt'>;

export function listFields(db: Tx): Promise<ProfileField[]> {
	return db
		.select()
		.from(profileFields)
		.orderBy(asc(profileFields.sortOrder), asc(profileFields.labelDe));
}

export async function createField(db: DB, actor: Actor, input: FieldInput) {
	return db.transaction(async (tx) => {
		const [f] = await tx.insert(profileFields).values(input).returning();
		await audit(tx, actor, {
			action: 'field.create',
			entityType: 'field',
			entityId: f.id,
			data: { after: { labelDe: f.labelDe, type: f.type } }
		});
		return f;
	});
}

export async function updateField(db: DB, actor: Actor, id: string, input: FieldInput) {
	await db.transaction(async (tx) => {
		const [before] = await tx.select().from(profileFields).where(eq(profileFields.id, id));
		if (!before) throw new DomainError('notFound');
		await tx.update(profileFields).set(input).where(eq(profileFields.id, id));
		const changes = diff(
			before as unknown as Record<string, unknown>,
			input as unknown as Record<string, unknown>
		);
		if (changes)
			await audit(tx, actor, {
				action: 'field.update',
				entityType: 'field',
				entityId: id,
				data: changes
			});
	});
}

/** Fields asked in a context. Registration fields are also editable in the profile. */
export function fieldsFor(
	all: ProfileField[],
	context: 'registration' | 'profile' | { goodieId: string }
) {
	return all.filter((f) => {
		if (!f.active) return false;
		if (context === 'registration') return f.context === 'registration';
		if (context === 'profile') return f.context === 'registration' || f.context === 'profile';
		return f.context === 'goodie' && f.goodieIds.includes(context.goodieId);
	});
}

export async function valuesOf(db: Tx, userId: string): Promise<Record<string, FieldValue>> {
	const rows = await db.select().from(profileValues).where(eq(profileValues.userId, userId));
	return Object.fromEntries(rows.map((r) => [r.fieldId, r.value]));
}

/** Values of many people for some fields – for rosters and the desk. */
export async function valuesFor(db: Tx, userIds: string[], fieldIds: string[]) {
	if (userIds.length === 0 || fieldIds.length === 0)
		return new Map<string, Record<string, FieldValue>>();
	const rows = await db
		.select()
		.from(profileValues)
		.where(and(inArray(profileValues.userId, userIds), inArray(profileValues.fieldId, fieldIds)));
	const result = new Map<string, Record<string, FieldValue>>();
	for (const r of rows)
		result.set(r.userId, { ...(result.get(r.userId) ?? {}), [r.fieldId]: r.value });
	return result;
}

export type FieldErrors = Record<string, MessageKey>;

/** Reads `field_<id>` inputs from a form. */
export function readFieldInput(form: FormData, fields: ProfileField[]): Record<string, string[]> {
	return Object.fromEntries(
		fields.map((f) => [
			f.id,
			form.getAll(`field_${f.id}`).filter((v): v is string => typeof v === 'string')
		])
	);
}

/** Validates all given fields; returns typed values or per-field errors (keys: `field_<id>`). */
export function validateFields(fields: ProfileField[], input: Record<string, string[]>) {
	const values: Record<string, FieldValue | null> = {};
	const errors: FieldErrors = {};
	for (const f of fields) {
		const parsed = parseFieldValue(f, input[f.id] ?? []);
		if (parsed.ok) values[f.id] = parsed.value;
		else errors[`field_${f.id}`] = parsed.error;
	}
	return { values, errors, ok: Object.keys(errors).length === 0 };
}

export async function saveValues(
	tx: Tx,
	userId: string,
	values: Record<string, FieldValue | null>
) {
	for (const [fieldId, value] of Object.entries(values)) {
		if (value === null) {
			await tx
				.delete(profileValues)
				.where(and(eq(profileValues.userId, userId), eq(profileValues.fieldId, fieldId)));
		} else {
			await tx
				.insert(profileValues)
				.values({ userId, fieldId, value })
				.onConflictDoUpdate({
					target: [profileValues.userId, profileValues.fieldId],
					set: { value }
				});
		}
	}
}

/** Required fields of a context the person has not answered yet. */
export function missingRequired(fields: ProfileField[], values: Record<string, FieldValue>) {
	return fields.filter((f) => f.required && !hasValue(values[f.id]));
}
