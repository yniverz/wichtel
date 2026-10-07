import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../db/client.ts';
import { createMemoryMailer } from '../mail.ts';
import { createTestDatabase } from '../testing/db.ts';
import { register } from './accounts.ts';
import {
	createField,
	fieldsFor,
	listFields,
	missingRequired,
	readFieldInput,
	saveValues,
	validateFields,
	valuesOf
} from './fields.ts';

let database: Database;
const actor = { userId: null };
beforeEach(async () => {
	database = await createTestDatabase();
});
afterEach(async () => {
	await database.close();
});

const base = {
	labelEn: '',
	helpDe: '',
	helpEn: '',
	options: [] as string[],
	goodieIds: [] as string[],
	showToLeads: false,
	active: true,
	sortOrder: 0
};

describe('profile fields', () => {
	it('asks fields in the right context and stores answers', async () => {
		const db = database.db;
		const kim = await register(
			{ db, mailer: createMemoryMailer(), baseUrl: 'http://test' },
			{
				email: 'kim@example.org',
				password: 'password 1234',
				firstName: 'Kim',
				lastName: 'M',
				phone: '1',
				locale: 'de'
			}
		);
		const goodieId = crypto.randomUUID();
		const birthday = await createField(db, actor, {
			...base,
			labelDe: 'Geburtsdatum',
			type: 'date',
			required: true,
			context: 'registration'
		});
		const diet = await createField(db, actor, {
			...base,
			labelDe: 'Ernährung',
			type: 'multiselect',
			options: ['vegan', 'vegetarisch'],
			required: false,
			context: 'profile'
		});
		const size = await createField(db, actor, {
			...base,
			labelDe: 'Größe',
			type: 'select',
			options: ['S', 'M'],
			required: true,
			context: 'goodie',
			goodieIds: [goodieId]
		});

		const all = await listFields(db);
		expect(fieldsFor(all, 'registration').map((f) => f.id)).toEqual([birthday.id]);
		expect(
			fieldsFor(all, 'profile')
				.map((f) => f.id)
				.sort()
		).toEqual([birthday.id, diet.id].sort());
		expect(fieldsFor(all, { goodieId }).map((f) => f.id)).toEqual([size.id]);
		expect(
			missingRequired(fieldsFor(all, 'profile'), await valuesOf(db, kim.id)).map((f) => f.id)
		).toEqual([birthday.id]);

		const form = new FormData();
		form.append(`field_${birthday.id}`, '2001-04-01');
		form.append(`field_${diet.id}`, 'vegan');
		const fields = fieldsFor(all, 'profile');
		const checked = validateFields(fields, readFieldInput(form, fields));
		expect(checked.ok).toBe(true);
		await saveValues(db, kim.id, checked.values);
		expect(await valuesOf(db, kim.id)).toEqual({
			[birthday.id]: '2001-04-01',
			[diet.id]: ['vegan']
		});

		// Clearing an optional answer removes it.
		await saveValues(db, kim.id, { [diet.id]: null });
		expect(Object.keys(await valuesOf(db, kim.id))).toEqual([birthday.id]);

		const bad = validateFields(fieldsFor(all, { goodieId }), { [size.id]: ['XL'] });
		expect(bad.errors).toEqual({ [`field_${size.id}`]: 'error.invalidOption' });
	});
});
