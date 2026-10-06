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
export function localized<T extends Record<string, unknown>>(
	entity: T,
	field: string,
	locale: Locale
): string {
	const de = entity[`${field}De`];
	const en = entity[`${field}En`];
	if (locale === 'en' && typeof en === 'string' && en.trim() !== '') return en;
	return typeof de === 'string' ? de : '';
}

export function formatDate(value: Date | string, locale: Locale, timeZone?: string): string {
	const date = typeof value === 'string' ? new Date(`${value}T12:00:00Z`) : value;
	return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
		dateStyle: 'medium',
		timeZone: typeof value === 'string' ? 'UTC' : timeZone
	}).format(date);
}

/** Compact range of two ISO dates, e.g. "24.–31.05.2027". */
export function formatDateRange(start: string, end: string, locale: Locale): string {
	const fmt = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
		day: 'numeric',
		month: locale === 'de' ? '2-digit' : 'short',
		year: 'numeric',
		timeZone: 'UTC'
	});
	return fmt.formatRange(new Date(`${start}T12:00:00Z`), new Date(`${end}T12:00:00Z`));
}

export function formatDateTime(value: Date, locale: Locale, timeZone?: string): string {
	return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone
	}).format(value);
}
