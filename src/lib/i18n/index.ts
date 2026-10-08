import { de } from './de.ts';
import { en } from './en.ts';

export const LOCALES = ['de', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export type MessageKey = keyof typeof de;
export type MessageParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: MessageParams) => string;

const catalogs: Record<Locale, Record<MessageKey, string>> = { de, en };

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function isMessageKey(value: string): value is MessageKey {
	return value in de;
}

function interpolate(template: string, params?: MessageParams): string {
	if (!params) return template;
	return template.replace(/\{(\w+)\}/g, (match, name: string) =>
		name in params ? String(params[name]) : match
	);
}

export function translator(locale: Locale): Translate {
	const catalog = catalogs[locale];
	return (key, params) => interpolate(catalog[key] ?? de[key] ?? key, params);
}

/** Picks the best of several Accept-Language entries, falling back to `fallback`. */
export function negotiateLocale(acceptLanguage: string | null, fallback: Locale): Locale {
	if (!acceptLanguage) return fallback;
	const ranked = acceptLanguage
		.split(',')
		.map((part) => {
			const [tag, q] = part.trim().split(';q=');
			return { lang: tag.slice(0, 2).toLowerCase(), q: q ? Number(q) : 1 };
		})
		.sort((a, b) => b.q - a.q);
	for (const { lang } of ranked) if (isLocale(lang)) return lang;
	return fallback;
}

/**
 * Reads a bilingual field (`nameDe`/`nameEn`), falling back to German if the English text is empty.
 */
export function localized(entity: object, field: string, locale: Locale): string {
	const record = entity as Record<string, unknown>;
	const de = record[`${field}De`];
	const en = record[`${field}En`];
	if (locale === 'en' && typeof en === 'string' && en.trim() !== '') return en;
	return typeof de === 'string' ? de : '';
}

/**
 * Creating an `Intl.DateTimeFormat` is expensive (long lists format thousands of times), so each
 * combination of locale, options and time zone is created once.
 */
const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(
	locale: Locale,
	kind: string,
	options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
	const key = `${locale}|${kind}|${options.timeZone ?? ''}`;
	let f = formatters.get(key);
	if (!f) {
		f = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', options);
		formatters.set(key, f);
	}
	return f;
}

export function formatDate(value: Date | string, locale: Locale, timeZone?: string): string {
	const date = typeof value === 'string' ? new Date(`${value}T12:00:00Z`) : value;
	return formatter(locale, 'date', {
		dateStyle: 'medium',
		timeZone: typeof value === 'string' ? 'UTC' : timeZone
	}).format(date);
}

/** Compact range of two ISO dates, e.g. "24.–31.05.2027". */
export function formatDateRange(start: string, end: string, locale: Locale): string {
	return formatter(locale, 'range', {
		day: 'numeric',
		month: locale === 'de' ? '2-digit' : 'short',
		year: 'numeric',
		timeZone: 'UTC'
	}).formatRange(new Date(`${start}T12:00:00Z`), new Date(`${end}T12:00:00Z`));
}

export function formatDateTime(value: Date, locale: Locale, timeZone?: string): string {
	return formatter(locale, 'dateTime', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone
	}).format(value);
}

/** "18:00" in the festival time zone. */
export function formatTime(value: Date | string, locale: Locale, timeZone: string): string {
	return formatter(locale, 'time', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone
	}).format(typeof value === 'string' ? new Date(value) : value);
}

/** Short day label for an ISO date, e.g. "Fr 12.06." / "Fri 12 Jun". */
export function formatDayShort(date: string, locale: Locale): string {
	return formatter(locale, 'dayShort', {
		weekday: 'short',
		day: 'numeric',
		month: locale === 'de' ? '2-digit' : 'short',
		timeZone: 'UTC'
	})
		.format(new Date(`${date}T12:00:00Z`))
		.replace(',', '');
}

/** Long day label, e.g. "Freitag, 12. Juni". */
export function formatDayLong(date: string, locale: Locale): string {
	return formatter(locale, 'dayLong', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	}).format(new Date(`${date}T12:00:00Z`));
}

/** "1 Punkt" / "3 Punkte" */
export function formatPoints(count: number, t: Translate): string {
	return Math.abs(count) === 1
		? t('points.one').replace('1', String(count))
		: t('points.many', { count });
}
