// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import starlightSidebarTopics from 'starlight-sidebar-topics';

/**
 * The help site. German is the root language (no prefix), English lives under /en/.
 * Every page exists in both languages under the same slug.
 *
 * The app links to these pages (see src/lib/help.ts in the app); a test there checks that
 * every linked slug exists, so rename pages only together with that file.
 */

/** A sidebar link to a page; its label comes from the page's own title in each language. */
const page = (slug) => ({ slug });

/** A sidebar group with a German and an English label. */
const group = (de, en, items, collapsed = false) => ({
	label: de,
	translations: { en },
	collapsed,
	items
});

export default defineConfig({
	site: 'https://yniverz.github.io',
	base: '/wichtel',
	trailingSlash: 'always',
	integrations: [
		starlight({
			title: { de: 'Wichtel Hilfe', en: 'Wichtel Help' },
			description: 'Hilfe für Wichtel, das Helfer- und Schichtsystem für ehrenamtliche Festivals.',
			logo: { src: './src/assets/logo.svg', replacesTitle: false },
			favicon: '/favicon.svg',
			defaultLocale: 'root',
			locales: {
				root: { label: 'Deutsch', lang: 'de' },
				en: { label: 'English', lang: 'en' }
			},
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/yniverz/wichtel' }],
			editLink: { baseUrl: 'https://github.com/yniverz/wichtel/edit/main/docs/' },
			lastUpdated: true,
			customCss: ['./src/styles/custom.css'],
			plugins: [
				starlightLinksValidator({ errorOnLocalLinks: false }),
				starlightSidebarTopics(
					[
						{
							label: { de: 'Ich helfe mit', en: 'I volunteer' },
							link: '/helpers/',
							icon: 'heart',
							items: [
								page('helpers'),
								group('Erste Schritte', 'Getting started', [page('helpers/account')]),
								group('Schichten', 'Shifts', [
									page('helpers/shifts'),
									page('helpers/cannot-book'),
									page('helpers/cancel-swap'),
									page('helpers/group'),
									page('helpers/calendar')
								]),
								group('Punkte und Goodies', 'Points and goodies', [
									page('helpers/points-goodies'),
									page('helpers/qualifications')
								]),
								group('Vor Ort und Infos', 'On site and news', [
									page('helpers/on-site'),
									page('helpers/news')
								]),
								group('Konto und Daten', 'Account and data', [
									page('helpers/emails'),
									page('helpers/privacy')
								])
							]
						},
						{
							label: { de: 'Ich leite einen Bereich', en: 'I lead an area' },
							link: '/leads/',
							icon: 'star',
							items: [
								page('leads'),
								group('Überblick', 'Overview', [page('leads/admin-area'), page('leads/dashboard')]),
								group('Schichten planen', 'Planning shifts', [
									page('leads/shifts'),
									page('leads/series'),
									page('leads/positions')
								]),
								group('Besetzung', 'Staffing', [
									page('leads/staffing'),
									page('leads/requests'),
									page('leads/urgent'),
									page('leads/people'),
									page('leads/qualifications')
								]),
								group('Kommunikation', 'Communication', [page('leads/news')]),
								group('Vor Ort', 'On site', [page('leads/desk'), page('leads/print')]),
								group('Extras', 'Extras', [page('leads/ai')])
							]
						},
						{
							label: { de: 'Ich organisiere das Festival', en: 'I run the festival' },
							link: '/organizers/',
							icon: 'setting',
							items: [
								page('organizers'),
								page('organizers/first-steps'),
								group('Struktur', 'Structure', [
									page('organizers/editions'),
									page('organizers/areas'),
									page('organizers/roles'),
									page('organizers/places')
								]),
								group('Regeln für Helfende', 'Rules for volunteers', [
									page('organizers/booking-rules'),
									page('organizers/waves'),
									page('organizers/points'),
									page('organizers/goodies'),
									page('organizers/qualifications'),
									page('organizers/fields')
								]),
								group('Personen', 'People', [page('organizers/people')]),
								group('Kommunikation', 'Communication', [
									page('organizers/mail'),
									page('organizers/help-link')
								]),
								group('System', 'System', [
									page('organizers/settings'),
									page('organizers/appearance'),
									page('organizers/privacy'),
									page('organizers/audit'),
									page('organizers/ai')
								])
							]
						},
						{
							label: { de: 'Ich betreibe den Server', en: 'I run the server' },
							link: '/operators/',
							icon: 'laptop',
							items: [
								page('operators'),
								group('Installieren', 'Install', [
									page('operators/install'),
									page('operators/portainer'),
									page('operators/configuration'),
									page('operators/reverse-proxy'),
									page('operators/email')
								]),
								group('Im Betrieb', 'Running', [
									page('operators/updates-backups'),
									page('operators/logs'),
									page('operators/capacity'),
									page('operators/privacy')
								]),
								group('Probleme lösen', 'Troubleshooting', [page('operators/troubleshooting')])
							]
						},
						{
							label: { de: 'Nachschlagen', en: 'Reference' },
							link: '/reference/',
							icon: 'open-book',
							items: [
								page('reference'),
								page('reference/glossary'),
								page('reference/features'),
								page('reference/permissions'),
								group('Mitentwickeln', 'Contributing', [
									page('reference/development'),
									page('reference/concept'),
									page('reference/design')
								])
							]
						}
					],
					{ exclude: ['/'] }
				)
			]
		})
	]
});
