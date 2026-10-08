import { fail } from '@sveltejs/kit';
import { arrayContains, eq } from 'drizzle-orm';
import { config, db } from '#lib/server/app.ts';
import { profileFields, qualifications, roles } from '#lib/server/db/schema.ts';
import { actorOf, getAdminContext, requireAdmin } from '#lib/server/guards.ts';
import { privacyTemplate, type PrivacyFacts } from '#lib/server/legal.ts';
import { legalSchema } from '#lib/server/schemas.ts';
import { getSettings, updateSettings } from '#lib/server/services/settings.ts';
import { parseForm } from '#lib/server/validation.ts';
import type { Locale } from '#lib/i18n/index.ts';
import type { Actions, PageServerLoad } from './$types';

/** What the privacy template should mention, read from how this instance is set up. */
async function facts(locale: Locale, today: Date, timeZone: string): Promise<PrivacyFacts> {
	const database = db();
	const [fields, mcpRoles, quals] = await Promise.all([
		database.select().from(profileFields).where(eq(profileFields.active, true)),
		database
			.select({ id: roles.id })
			.from(roles)
			.where(arrayContains(roles.permissions, ['mcp.use'])),
		database.select({ id: qualifications.id }).from(qualifications).limit(1)
	]);
	return {
		profileFields: fields
			.filter((f) => f.context !== 'goodie')
			.map((f) => (locale === 'en' ? f.labelEn || f.labelDe : f.labelDe)),
		aiAssistants: mcpRoles.length > 0,
		qualifications: quals.length > 0,
		mailServer: config.mailServer,
		today: today.toLocaleDateString(locale === 'en' ? 'en-GB' : 'de-DE', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone
		})
	};
}

export const load: PageServerLoad = async (event) => {
	requireAdmin(await getAdminContext(event));
	const settings = await getSettings(db());
	const now = new Date();
	const [de, en] = await Promise.all([
		facts('de', now, settings.timezone),
		facts('en', now, settings.timezone)
	]);
	const {
		legalName,
		legalAddress,
		legalRepresentative,
		legalEmail,
		legalPhone,
		legalRegister,
		legalVatId,
		imprintExtraDe,
		imprintExtraEn,
		privacyOfficer,
		privacyDe,
		privacyEn,
		imprintUrl,
		privacyUrl,
		retentionMonths,
		auditIpDays
	} = settings;
	return {
		current: {
			legalName,
			legalAddress,
			legalRepresentative,
			legalEmail,
			legalPhone,
			legalRegister,
			legalVatId,
			imprintExtraDe,
			imprintExtraEn,
			privacyOfficer,
			privacyDe,
			privacyEn,
			imprintUrl,
			privacyUrl,
			retentionMonths,
			auditIpDays
		},
		/** The template reflects the saved details; save first, then insert it. */
		template: {
			de: privacyTemplate(settings, de, 'de'),
			en: privacyTemplate(settings, en, 'en')
		}
	};
};

export const actions: Actions = {
	default: async (event) => {
		requireAdmin(await getAdminContext(event));
		const parsed = parseForm(legalSchema, await event.request.formData());
		if (!parsed.ok) return fail(400, { errors: parsed.errors, values: parsed.values });
		await updateSettings(db(), actorOf(event), parsed.data);
		return { success: 'common.saved' };
	}
};
