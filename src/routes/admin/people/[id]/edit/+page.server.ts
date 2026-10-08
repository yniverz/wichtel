import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '#lib/server/app.ts';
import { audit } from '#lib/server/audit.ts';
import { fieldView } from '#lib/server/field-views.ts';
import { actorOf, attempt, getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import { updateAccount } from '#lib/server/services/accounts.ts';
import {
	fieldsFor,
	listFields,
	readFieldInput,
	saveValues,
	validateFields,
	valuesOf
} from '#lib/server/services/fields.ts';
import { getPerson } from '#lib/server/services/people.ts';
import { email, parseForm, phone, requiredText } from '#lib/server/validation.ts';
import { LOCALES } from '#lib/i18n/index.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

/** Only instance administrators edit other people's accounts. */
async function editablePerson(event: RequestEvent) {
	requireAdmin(await getAdminContext(event));
	const person = await getPerson(db(), event.params.id);
	if (!person || person.deletedAt) error(404, 'error.notFound');
	return person;
}

export const load: PageServerLoad = async (event) => {
	const person = await editablePerson(event);
	return {
		person: {
			id: person.id,
			firstName: person.firstName,
			lastName: person.lastName,
			email: person.email,
			phone: person.phone,
			locale: person.locale
		},
		fields: fieldsFor(await listFields(db()), 'profile').map(fieldView),
		fieldValues: await valuesOf(db(), person.id)
	};
};

const accountSchema = z.object({
	firstName: requiredText(100),
	lastName: requiredText(100),
	email,
	phone,
	locale: z.enum(LOCALES)
});

export const actions: Actions = {
	account: async (event) => {
		const person = await editablePerson(event);
		const parsed = parseForm(accountSchema, await event.request.formData());
		if (!parsed.ok)
			return fail(400, { action: 'account', errors: parsed.errors, values: parsed.values });
		const result = await attempt(
			() => updateAccount(db(), actorOf(event), person.id, parsed.data),
			{ action: 'account', values: parsed.values }
		);
		if (!result.ok) return result.failure;
		return { action: 'account', success: 'common.saved' };
	},
	fields: async (event) => {
		const person = await editablePerson(event);
		const fields = fieldsFor(await listFields(db()), 'profile');
		const checked = validateFields(fields, readFieldInput(await event.request.formData(), fields));
		if (!checked.ok) return fail(400, { action: 'fields', errors: checked.errors });
		await db().transaction(async (tx) => {
			await saveValues(tx, person.id, checked.values);
			await audit(tx, actorOf(event), {
				action: 'user.update',
				entityType: 'user',
				entityId: person.id,
				data: { fields: ['profileFields'] }
			});
		});
		return { action: 'fields', success: 'common.saved' };
	}
};
