import { z } from 'zod';
import { PERMISSIONS } from '#lib/domain/permissions.ts';
import { LOCALES } from '#lib/i18n/index.ts';
import {
	checkbox,
	hexColor,
	isoDate,
	optionalEmail,
	optionalText,
	optionalUrl,
	optionalUuid,
	requiredText
} from './validation.ts';

/** Form schemas shared between several routes. */

export const editionSchema = z.object({
	name: requiredText(100),
	startsOn: isoDate,
	endsOn: isoDate
});

export const areaSchema = z.object({
	parentId: optionalUuid,
	nameDe: requiredText(100),
	nameEn: optionalText(100),
	descriptionDe: optionalText(2000),
	descriptionEn: optionalText(2000),
	sortOrder: z.coerce.number('error.required').int().min(-9999).max(9999).default(0)
});

export const roleSchema = z.object({
	nameDe: requiredText(100),
	nameEn: optionalText(100),
	descriptionDe: optionalText(1000),
	descriptionEn: optionalText(1000),
	'permissions[]': z.array(z.enum(PERMISSIONS)).default([])
});

export const settingsSchema = z.object({
	festivalName: requiredText(100),
	taglineDe: optionalText(200),
	taglineEn: optionalText(200),
	primaryColor: hexColor,
	accentColor: hexColor,
	contactEmail: optionalEmail,
	imprintUrl: optionalUrl,
	privacyUrl: optionalUrl,
	defaultLocale: z.enum(LOCALES),
	timezone: requiredText(64).refine((tz) => {
		try {
			new Intl.DateTimeFormat('en', { timeZone: tz });
			return true;
		} catch {
			return false;
		}
	}, 'error.required'),
	registrationOpen: checkbox
});
