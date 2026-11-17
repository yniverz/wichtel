/**
 * Screenshots of the app for the help site (see README.md in this folder).
 *
 *   npm run docs:screenshots                  everything: seed, build, start, capture, clean up
 *   npm run docs:screenshots -- helper-goodies admin-waves   only these screenshots
 *   npm run docs:screenshots -- --no-build    reuse the existing build/ folder
 *
 * Seeds a fresh demo database (seed.ts) in a temporary directory, starts the built app on it and
 * captures every screenshot in `SHOTS` in German and English into
 * docs/src/assets/screenshots/{de,en}/<name>.png.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium, devices, type Browser, type Page } from '@playwright/test';

type Persona = 'admin' | 'lead' | 'helper';
type Locale = 'de' | 'en';
type Ids = Record<
	| 'festivalFrom'
	| 'festivalTo'
	| 'helperShift'
	| 'editorShift'
	| 'urgentShift'
	| 'barNews'
	| 'areaLeadRole'
	| 'helperUser'
	| 'deskUser',
	string
>;
type Locator = ReturnType<Page['locator']>;

interface Shot {
	/** File name without extension; stable, because help pages embed it. */
	name: string;
	persona: Persona;
	device: 'phone' | 'desktop';
	path: (ids: Ids) => string;
	/** Screenshot of this element instead of the viewport. */
	element?: (page: Page, locale: Locale) => Locator;
	/** Scrolls this element to the top of the viewport (below sticky bars) first. */
	scrollTo?: (page: Page, locale: Locale) => Locator;
	/** Runs before the screenshot, e.g. to open a dialog or fill in a form. */
	prepare?: (page: Page, locale: Locale, ids: Ids) => Promise<void>;
}

const t = (locale: Locale, de: string, en: string) => (locale === 'de' ? de : en);
const heading = (page: Page, name: string) =>
	page.getByRole('heading', { name, exact: true }).first();
/** A card (or section) by its heading. */
const section = (page: Page, name: string) =>
	page.locator('section').filter({ has: page.getByRole('heading', { name, exact: true }) });

export const SHOTS: Shot[] = [
	// Volunteers, on the phone ------------------------------------------------
	{ name: 'helper-home', persona: 'helper', device: 'phone', path: () => '/app' },
	{
		name: 'helper-home-shifts',
		persona: 'helper',
		device: 'phone',
		path: () => '/app',
		scrollTo: (page, l) => heading(page, t(l, 'Deine Schichten', 'Your shifts'))
	},
	{
		name: 'helper-shifts',
		persona: 'helper',
		device: 'phone',
		path: (ids) => `/app/shifts?day=${ids.festivalFrom}`
	},
	{
		name: 'helper-shift-detail',
		persona: 'helper',
		device: 'phone',
		path: (ids) => `/app/shifts?shift=${ids.helperShift}`,
		scrollTo: (page) =>
			page.locator('li[id^="row-"]').filter({ has: page.locator('[id^="shift-"]') })
	},
	{ name: 'helper-goodies', persona: 'helper', device: 'phone', path: () => '/app/goodies' },
	{
		name: 'helper-goodies-trade',
		persona: 'helper',
		device: 'phone',
		path: () => '/app/goodies',
		scrollTo: (page, l) => heading(page, t(l, 'Eintauschen', 'Trade in'))
	},
	{
		name: 'helper-qr-code',
		persona: 'helper',
		device: 'phone',
		path: () => '/app/goodies',
		prepare: async (page, l) => {
			await page.getByRole('button', { name: t(l, 'Meinen Code zeigen', 'Show my code') }).click();
			await page.locator('dialog[open]').waitFor();
		}
	},
	{ name: 'helper-profile', persona: 'helper', device: 'phone', path: () => '/app/profile' },
	{ name: 'helper-news', persona: 'helper', device: 'phone', path: () => '/app/news' },
	{ name: 'helper-group', persona: 'helper', device: 'phone', path: () => '/app/group' },

	// Area lead of the bar, on a laptop -----------------------------------------
	{ name: 'lead-dashboard', persona: 'lead', device: 'desktop', path: () => '/admin' },
	{ name: 'lead-shifts', persona: 'lead', device: 'desktop', path: () => '/admin/shifts' },
	{
		name: 'lead-shift-editor',
		persona: 'lead',
		device: 'desktop',
		path: (ids) => `/admin/shifts/${ids.editorShift}`
	},
	{
		name: 'lead-series',
		persona: 'lead',
		device: 'desktop',
		path: () => '/admin/shifts/series',
		prepare: async (page, l, ids) => {
			await page.getByLabel(t(l, 'Titel (Deutsch)', 'Title (German)')).fill('Theke');
			await page.getByLabel(t(l, 'Titel (Englisch)', 'Title (English)')).fill('Bar counter');
			const dates = page.locator('input[type="date"]');
			await dates.nth(0).fill(ids.festivalFrom);
			await dates.nth(1).fill(ids.festivalTo);
			const times = page.locator('input[type="time"]');
			await times.nth(0).fill('16:00');
			await times.nth(1).fill('20:00');
			await page.locator('h1').click(); // leave the field, so the preview updates
		}
	},
	{ name: 'lead-requests', persona: 'lead', device: 'desktop', path: () => '/admin/requests' },
	{
		name: 'lead-news-editor',
		persona: 'lead',
		device: 'desktop',
		path: (ids) => `/admin/news/${ids.barNews}`
	},

	// Organizers (admin) ----------------------------------------------------------
	{ name: 'admin-dashboard', persona: 'admin', device: 'desktop', path: () => '/admin' },
	{
		name: 'admin-urgent',
		persona: 'admin',
		device: 'desktop',
		path: (ids) => `/admin/shifts/${ids.urgentShift}`
	},
	{ name: 'admin-requests', persona: 'admin', device: 'desktop', path: () => '/admin/requests' },
	{
		name: 'admin-desk',
		persona: 'admin',
		device: 'desktop',
		path: (ids) => `/admin/desk/${ids.deskUser}`
	},
	{ name: 'admin-waves', persona: 'admin', device: 'desktop', path: () => '/admin/waves' },
	{
		name: 'admin-role-editor',
		persona: 'admin',
		device: 'desktop',
		path: (ids) => `/admin/roles/${ids.areaLeadRole}`
	},
	{ name: 'admin-goodies', persona: 'admin', device: 'desktop', path: () => '/admin/goodies' },
	{ name: 'admin-settings', persona: 'admin', device: 'desktop', path: () => '/admin/settings' },
	{
		name: 'admin-settings-help',
		persona: 'admin',
		device: 'desktop',
		path: () => '/admin/settings',
		element: (page, l) => section(page, t(l, 'Hilfe', 'Help'))
	}
];

// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = path.join(ROOT, 'docs/src/assets/screenshots');
const PORT = 4391;
const BASE = `http://localhost:${PORT}`;

const PHONE = {
	...devices['iPhone 13'],
	deviceScaleFactor: 2,
	// Chromium only: the iPhone profile defaults to WebKit, which is not installed everywhere.
	defaultBrowserType: undefined
};
const DESKTOP = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 };

function run(command: string, args: string[], env: NodeJS.ProcessEnv = {}) {
	const result = spawnSync(command, args, {
		cwd: ROOT,
		stdio: 'inherit',
		env: { ...process.env, ...env }
	});
	if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`);
}

async function startServer(dataDir: string): Promise<ChildProcess> {
	const server = spawn(process.execPath, ['build'], {
		cwd: ROOT,
		stdio: ['ignore', 'ignore', 'inherit'],
		env: {
			...process.env,
			NODE_ENV: 'production',
			PORT: String(PORT),
			HOST: '127.0.0.1',
			// adapter-node assumes https unless told otherwise; the browser sends this header.
			PROTOCOL_HEADER: 'x-forwarded-proto',
			PUBLIC_URL: BASE,
			DATABASE_URL: `pglite://${path.join(dataDir, 'db')}`,
			UPLOAD_DIR: path.join(dataDir, 'uploads'),
			// A mail server that is never reached: no "no mail server" warning on the screenshots,
			// and the seed marked all its e-mails as sent.
			SMTP_HOST: '127.0.0.1',
			SMTP_PORT: '9',
			LOG_LEVEL: 'error'
		}
	});
	for (let i = 0; i < 120; i++) {
		if (server.exitCode !== null) throw new Error('The app did not start.');
		try {
			if ((await fetch(`${BASE}/healthz`)).ok) return server;
		} catch {
			// not up yet
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	server.kill();
	throw new Error('The app did not answer within a minute.');
}

type Personas = Record<Persona, { session: string }> & { ids: Ids };

async function capture(personas: Personas, only: string[]) {
	const wanted = SHOTS.filter((s) => only.length === 0 || only.includes(s.name));
	for (const locale of ['de', 'en'] as const) {
		mkdirSync(path.join(OUT, locale), { recursive: true });
		// Date and time fields follow the language of the browser process, not the page's.
		const posix = `${BROWSER_LOCALE[locale].replace('-', '_')}.UTF-8`;
		const browser = await chromium.launch({
			env: { ...process.env, LANG: posix, LC_ALL: posix, LANGUAGE: posix.split('.')[0] }
		});
		try {
			await captureLocale(browser, locale, personas, wanted);
		} finally {
			await browser.close();
		}
	}
}

const BROWSER_LOCALE = { de: 'de-DE', en: 'en-GB' } as const;

async function captureLocale(browser: Browser, locale: Locale, personas: Personas, wanted: Shot[]) {
	for (const persona of ['helper', 'lead', 'admin'] as const) {
		for (const device of ['phone', 'desktop'] as const) {
			const shots = wanted.filter((s) => s.persona === persona && s.device === device);
			if (shots.length === 0) continue;
			const context = await browser.newContext({
				...(device === 'phone' ? PHONE : DESKTOP),
				locale: BROWSER_LOCALE[locale],
				timezoneId: 'Europe/Berlin',
				colorScheme: 'light',
				reducedMotion: 'reduce',
				extraHTTPHeaders: { 'x-forwarded-proto': 'http' }
			});
			await context.addCookies([
				{ name: 'wichtel_session', value: personas[persona].session, url: BASE }
			]);
			const page = await context.newPage();
			await setLocale(page, locale);
			for (const shot of shots) await take(page, shot, locale, personas.ids);
			await context.close();
		}
	}
}

/** The person's language is stored with the account; switch it like a person would. */
async function setLocale(page: Page, locale: Locale) {
	await page.goto(`${BASE}/app`);
	const button = page.locator(`form[action="/locale"] button[value="${locale}"]`).first();
	if ((await button.getAttribute('aria-pressed')) === 'true') return;
	await button.click();
	await page.waitForFunction((l) => document.documentElement.lang === l, locale);
}

/** Scrolls the element to the top of the viewport, just below whatever sticks there. */
async function scrollToTop(target: Locator) {
	await target.evaluate((el) => {
		window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
		const covered = [...document.querySelectorAll<HTMLElement>('body *')]
			.filter((e) => ['sticky', 'fixed'].includes(getComputedStyle(e).position))
			.map((e) => e.getBoundingClientRect())
			.filter((r) => r.top < 150 && r.bottom > 0 && r.height < window.innerHeight / 2)
			.reduce((max, r) => Math.max(max, r.bottom), 0);
		window.scrollBy(0, -(covered + 16));
	});
}

async function take(page: Page, shot: Shot, locale: Locale, ids: Ids) {
	const url = `${BASE}${shot.path(ids)}`;
	const response = await page.goto(url, { waitUntil: 'networkidle' });
	if (!response?.ok()) throw new Error(`${shot.name}: ${url} answered ${response?.status()}`);
	if (new URL(page.url()).pathname === '/login') throw new Error(`${shot.name}: not signed in`);
	if ((await page.evaluate(() => document.documentElement.lang)) !== locale)
		throw new Error(`${shot.name}: page is not in ${locale}`);
	await page.evaluate(() => document.fonts.ready);
	if (shot.prepare) await shot.prepare(page, locale, ids);
	if (shot.scrollTo) await scrollToTop(shot.scrollTo(page, locale));
	await page.waitForTimeout(200); // let lazy images and transitions settle
	const file = path.join(OUT, locale, `${shot.name}.png`);
	const options = { path: file, animations: 'disabled', caret: 'hide' } as const;
	if (shot.element) await shot.element(page, locale).screenshot(options);
	else await page.screenshot(options);
	console.log(`  ${locale}/${shot.name}.png  ${Math.round(statSync(file).size / 1024)} KB`);
}

async function main() {
	const args = process.argv.slice(2);
	const only = args.filter((a) => !a.startsWith('--'));
	const unknown = only.filter((name) => !SHOTS.some((s) => s.name === name));
	if (unknown.length) throw new Error(`Unknown screenshots: ${unknown.join(', ')}`);

	const started = Date.now();
	const dataDir = mkdtempSync(path.join(tmpdir(), 'wichtel-screenshots-'));
	let server: ChildProcess | undefined;
	try {
		console.log('Seeding demo data …');
		run('npx', ['tsx', 'scripts/screenshots/seed.ts', dataDir], {
			DATABASE_URL: `pglite://${path.join(dataDir, 'db')}`
		});
		if (!args.includes('--no-build')) {
			console.log('Building the app …');
			run('npm', ['run', 'build', '--silent']);
		}
		console.log('Starting the app …');
		server = await startServer(dataDir);
		const personas = JSON.parse(readFileSync(path.join(dataDir, 'personas.json'), 'utf8'));
		console.log('Capturing …');
		await capture(personas, only);
	} finally {
		if (server && server.exitCode === null) {
			// The database is thrown away anyway; no need to wait for a graceful shutdown.
			const exited = new Promise((r) => server!.once('exit', r));
			server.kill('SIGKILL');
			await exited;
		}
		rmSync(dataDir, { recursive: true, force: true });
	}
	console.log(`Done in ${Math.round((Date.now() - started) / 1000)} s.`);
}

await main();
