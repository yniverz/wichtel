import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { helperHelpLink, helpLink, helpSiteUrl, ROUTE_HELP } from './help.ts';

const ROUTES = join(import.meta.dirname, '../routes');
const DOCS = join(import.meta.dirname, '../../docs/src/content/docs');

/** Route ids of all pages, as SvelteKit names them (`/admin/shifts/[id=uuid]`). */
function pageRouteIds(dir = ROUTES): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return pageRouteIds(path);
		if (entry.name !== '+page.svelte') return [];
		const route = relative(ROUTES, dir).split(sep).join('/');
		return [`/${route}`];
	});
}

/** Print views are opened from other pages and have no navigation of their own. */
const WITHOUT_HELP = ['/print/plan', '/print/shift/[id=uuid]'];

function helpPageExists(slug: string, locale: 'de' | 'en'): boolean {
	const base = join(DOCS, locale === 'en' ? 'en' : '', slug);
	return ['.md', '.mdx', '/index.md', '/index.mdx'].some((ext) => existsSync(base + ext));
}

describe('help links', () => {
	it('exist for every page', () => {
		const missing = pageRouteIds().filter((id) => !WITHOUT_HELP.includes(id) && !ROUTE_HELP[id]);
		expect(missing).toEqual([]);
	});

	it('point to help pages that exist in both languages', () => {
		const slugs = [...new Set([...Object.values(ROUTE_HELP), 'helpers'])];
		const missing = slugs.flatMap((slug) =>
			(['de', 'en'] as const).filter((l) => !helpPageExists(slug, l)).map((l) => `${l}:${slug}`)
		);
		expect(missing).toEqual([]);
	});

	it('use the language of the person', () => {
		expect(helpSiteUrl('helpers/shifts', 'de')).toBe(
			'https://yniverz.github.io/wichtel/helpers/shifts/'
		);
		expect(helpSiteUrl('helpers/shifts', 'en')).toBe(
			'https://yniverz.github.io/wichtel/en/helpers/shifts/'
		);
	});

	it('lead helpers to the festival FAQ, but keep the admin area on the Wichtel help', () => {
		const faq = 'https://festival.example/faq';
		expect(helpLink('/app/shifts', 'de', faq)).toBe(faq);
		expect(helpLink('/(auth)/login', 'en', faq)).toBe(faq);
		expect(helpLink('/admin/shifts', 'de', faq)).toBe(
			'https://yniverz.github.io/wichtel/leads/shifts/'
		);
		expect(helpLink('/app/shifts', 'de', '')).toBe(
			'https://yniverz.github.io/wichtel/helpers/shifts/'
		);
		expect(helperHelpLink('en', faq)).toBe(faq);
		expect(helperHelpLink('en', '')).toBe('https://yniverz.github.io/wichtel/en/helpers/');
	});

	it('are missing only where a page has none', () => {
		expect(helpLink('/print/plan', 'de', '')).toBeNull();
		expect(helpLink(null, 'de', '')).toBeNull();
	});
});
