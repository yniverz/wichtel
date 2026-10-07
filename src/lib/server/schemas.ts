import { z } from 'zod';
import { PERMISSIONS } from '#lib/domain/permissions.ts';
import { isWallTime } from '#lib/domain/time.ts';
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

const wholeNumber = z.coerce
	.number('error.invalidNumber')
	.int('error.invalidNumber')
	.min(0, 'error.invalidNumber')
	.max(10000, 'error.invalidNumber');

/** Empty string → null, otherwise a whole number ≥ 0 (hours, points, …). */
const optionalHours = z
	.string()
	.trim()
	.optional()
	.transform((v) => (v === undefined || v === '' ? null : Number(v)))
	.pipe(
		z
			.number('error.invalidNumber')
			.int('error.invalidNumber')
			.min(0)
			.max(24 * 60)
			.nullable()
	);

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
	sortOrder: z.coerce.number('error.required').int().min(-9999).max(9999).default(0),
	cancelDeadlineHours: optionalHours,
	pointsPerShift: optionalHours,
	pointsPerHour: optionalHours
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
	registrationOpen: checkbox,
	cancelDeadlineHours: z.coerce
		.number('error.invalidNumber')
		.int('error.invalidNumber')
		.min(0)
		.max(24 * 60),
	pointsPerShift: wholeNumber,
	pointsPerHour: wholeNumber,
	nightBonus: wholeNumber,
	nightStart: z.string().refine(isWallTime, 'error.invalidTime'),
	nightEnd: z.string().refine(isWallTime, 'error.invalidTime'),
	lastMinuteBonus: wholeNumber,
	lastMinuteHours: wholeNumber,
	minBreakMinutes: z.coerce
		.number('error.invalidNumber')
		.int('error.invalidNumber')
		.min(0)
		.max(24 * 60)
});

const wallTime = z.string().refine(isWallTime, 'error.invalidTime');

const positionSchema = z.object({
	id: z.uuid().optional(),
	nameDe: z.string().trim().min(1, 'error.required').max(100, 'error.tooLong'),
	nameEn: z.string().trim().max(100, 'error.tooLong').default(''),
	descriptionDe: z.string().trim().max(1000, 'error.tooLong').default(''),
	descriptionEn: z.string().trim().max(1000, 'error.tooLong').default(''),
	capacity: z.coerce.number('error.invalidNumber').int('error.invalidNumber').min(1).max(500),
	bookingMode: z.enum(['open', 'request']),
	pointsPerShift: z.number().int().min(0).max(1000).nullable().default(null),
	pointsPerHour: z.number().int().min(0).max(1000).nullable().default(null)
});

/** Positions are edited client-side and submitted as one JSON field. */
const positionsJson = z
	.string()
	.transform((raw, ctx) => {
		try {
			return JSON.parse(raw) as unknown;
		} catch {
			ctx.addIssue({ code: 'custom', message: 'error.positionsRequired' });
			return z.NEVER;
		}
	})
	.pipe(
		z.array(positionSchema, 'error.positionsRequired').min(1, 'error.positionsRequired').max(20)
	);

const shiftDetails = {
	areaId: z.uuid('error.required'),
	titleDe: requiredText(120),
	titleEn: optionalText(120),
	descriptionDe: optionalText(4000),
	descriptionEn: optionalText(4000),
	location: optionalText(200),
	meetingPoint: optionalText(200),
	contact: optionalText(200),
	visibility: z.enum(['public', 'internal']).default('public'),
	cancelDeadlineHours: optionalHours,
	positions: positionsJson
};

export const shiftSchema = z.object({
	...shiftDetails,
	date: isoDate,
	start: wallTime,
	end: wallTime
});

export const seriesSchema = z.object({
	...shiftDetails,
	from: isoDate,
	to: isoDate,
	'weekdays[]': z.array(z.coerce.number().int().min(0).max(6)).default([]),
	slots: z
		.string()
		.transform((raw) => {
			try {
				return JSON.parse(raw) as unknown;
			} catch {
				return [];
			}
		})
		.pipe(
			z
				.array(z.object({ start: wallTime, end: wallTime }))
				.min(1, 'error.seriesEmpty')
				.max(24)
		)
});

export const goodieSchema = z.object({
	nameDe: requiredText(100),
	nameEn: optionalText(100),
	descriptionDe: optionalText(1000),
	descriptionEn: optionalText(1000),
	price: wholeNumber,
	maxPerPerson: z.coerce
		.number('error.invalidNumber')
		.int('error.invalidNumber')
		.min(1, 'error.invalidNumber')
		.max(100),
	selfServiceLimit: optionalHours,
	stock: optionalHours,
	variants: z
		.string()
		.max(500, 'error.tooLong')
		.default('')
		.transform((v) =>
			[
				...new Set(
					v
						.split(',')
						.map((x) => x.trim())
						.filter(Boolean)
				)
			].slice(0, 30)
		),
	'requiredAreaIds[]': z.array(z.uuid()).default([]),
	mandatory: checkbox,
	mandatoryPriority: z.coerce.number().int().min(0).max(1000).default(0),
	refundable: checkbox,
	advance: checkbox,
	active: checkbox,
	sortOrder: z.coerce.number().int().min(-9999).max(9999).default(0)
});
