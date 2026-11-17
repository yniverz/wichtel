import type { Locale } from '#lib/i18n/index.ts';

/**
 * Links from the app to the help site (`docs/`, published at HELP_SITE).
 *
 * Every page knows its help page through ROUTE_HELP. The helper area can point to the festival's
 * own FAQ instead (setting `helpUrl`); the admin area always links to the Wichtel help, because a
 * festival FAQ will not explain how to plan shifts. `help.test.ts` checks that every page has an
 * entry and that every linked help page exists in both languages.
 */
export const HELP_SITE = 'https://yniverz.github.io/wichtel/';

/** Help page (slug on the help site) per route id. */
export const ROUTE_HELP: Record<string, string> = {
	// Helpers
	'/': 'helpers',
	'/app': 'helpers',
	'/app/shifts': 'helpers/shifts',
	'/app/goodies': 'helpers/points-goodies',
	'/app/group': 'helpers/group',
	'/app/news': 'helpers/news',
	'/app/news/[id=uuid]': 'helpers/news',
	'/app/profile': 'helpers/account',
	'/app/qualifications': 'helpers/qualifications',
	'/news': 'helpers/news',
	'/news/[id=uuid]': 'helpers/news',
	'/(auth)/login': 'helpers/account',
	'/(auth)/register': 'helpers/account',
	'/(auth)/forgot-password': 'helpers/account',
	'/(auth)/reset-password': 'helpers/account',
	'/(auth)/verify-email': 'helpers/account',
	'/(auth)/oauth/authorize': 'leads/ai',
	'/(auth)/setup': 'organizers/first-steps',
	'/legal/imprint': 'helpers/privacy',
	'/legal/privacy': 'helpers/privacy',

	// Admin area
	'/admin': 'leads/dashboard',
	'/admin/desk': 'leads/desk',
	'/admin/desk/[userId=uuid]': 'leads/desk',
	'/admin/shifts': 'leads/shifts',
	'/admin/shifts/new': 'leads/shifts',
	'/admin/shifts/[id=uuid]': 'leads/shifts',
	'/admin/shifts/series': 'leads/series',
	'/admin/requests': 'leads/requests',
	'/admin/people': 'leads/people',
	'/admin/people/[id=uuid]': 'leads/people',
	'/admin/people/[id=uuid]/edit': 'organizers/people',
	'/admin/qualifications': 'leads/qualifications',
	'/admin/news': 'leads/news',
	'/admin/news/new': 'leads/news',
	'/admin/news/[id=uuid]': 'leads/news',
	'/admin/waves': 'organizers/waves',
	'/admin/areas': 'organizers/areas',
	'/admin/areas/new': 'organizers/areas',
	'/admin/areas/[id=uuid]': 'organizers/areas',
	'/admin/places': 'organizers/places',
	'/admin/goodies': 'organizers/goodies',
	'/admin/goodies/new': 'organizers/goodies',
	'/admin/goodies/[id=uuid]': 'organizers/goodies',
	'/admin/roles': 'organizers/roles',
	'/admin/roles/new': 'organizers/roles',
	'/admin/roles/[id=uuid]': 'organizers/roles',
	'/admin/fields': 'organizers/fields',
	'/admin/mail/templates': 'organizers/mail',
	'/admin/mail/outbox': 'organizers/mail',
	'/admin/editions': 'organizers/editions',
	'/admin/editions/[id=uuid]': 'organizers/editions',
	'/admin/settings': 'organizers/settings',
	'/admin/legal': 'organizers/privacy',
	'/admin/audit': 'organizers/audit'
};

/** Address of a page on the help site; German is the root language, English lives under /en/. */
export function helpSiteUrl(slug: string, locale: Locale): string {
	const path = slug ? `${slug}/` : '';
	return `${HELP_SITE}${locale === 'en' ? 'en/' : ''}${path}`;
}

/** Whether a route belongs to the admin area, which always links to the Wichtel help. */
const isAdminRoute = (routeId: string) => routeId === '/admin' || routeId.startsWith('/admin/');

/**
 * The help link for a page, or null if the page has none (print views, errors).
 * `customUrl` is the festival's own help page, used everywhere outside the admin area.
 */
export function helpLink(
	routeId: string | null,
	locale: Locale,
	customUrl: string | undefined
): string | null {
	if (!routeId) return null;
	const slug = ROUTE_HELP[routeId];
	if (slug === undefined) return null;
	if (customUrl && !isAdminRoute(routeId)) return customUrl;
	return helpSiteUrl(slug, locale);
}

/** General help for helpers (footer): the festival's own page or the helper section. */
export function helperHelpLink(locale: Locale, customUrl: string | undefined): string {
	return customUrl || helpSiteUrl('helpers', locale);
}
