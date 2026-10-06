import { describe, expect, it } from 'vitest';
import { de } from './de.ts';
import { en } from './en.ts';
import { formatDateRange, localized, negotiateLocale, translator } from './index.ts';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('i18n catalogs', () => {
	it('have the same keys and placeholders', () => {
		expect(Object.keys(en).sort()).toEqual(Object.keys(de).sort());
		for (const key of Object.keys(de) as (keyof typeof de)[]) {
			expect(placeholders(en[key]), key).toEqual(placeholders(de[key]));
			expect(en[key].trim(), key).not.toBe('');
		}
	});

	it('interpolates parameters', () => {
		expect(translator('de')('app.home.greeting', { name: 'Kim' })).toBe('Hallo Kim!');
		expect(translator('en')('app.home.greeting', { name: 'Kim' })).toBe('Hi Kim!');
	});

	it('negotiates Accept-Language', () => {
		expect(negotiateLocale('en-US,en;q=0.9,de;q=0.8', 'de')).toBe('en');
		expect(negotiateLocale('fr-FR,de;q=0.5', 'en')).toBe('de');
		expect(negotiateLocale('fr-FR', 'de')).toBe('de');
		expect(negotiateLocale(null, 'en')).toBe('en');
	});

	it('falls back to German content', () => {
		expect(localized({ nameDe: 'Aufbau', nameEn: '' }, 'name', 'en')).toBe('Aufbau');
		expect(localized({ nameDe: 'Aufbau', nameEn: 'Setup' }, 'name', 'en')).toBe('Setup');
	});

	it('formats date ranges', () => {
		expect(formatDateRange('2027-05-24', '2027-06-13', 'de')).toContain('2027');
	});
});
