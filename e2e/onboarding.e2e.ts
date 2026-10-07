import { createHash, randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { ADMIN, HELPER, SETUP_TOKEN } from './fixtures.ts';

// One in-memory database is shared by the whole run, so the steps build on each other.
test.describe.configure({ mode: 'serial' });
test.skip(({ isMobile }) => isMobile, 'state-changing flow runs once on desktop');

test('admin completes setup and creates an area', async ({ page }) => {
	await page.goto(`/setup?token=${SETUP_TOKEN}`);
	await page.getByLabel('Name des Festivals').fill('E2E-Fest');
	await page.getByLabel('Vorname').fill(ADMIN.firstName);
	await page.getByLabel('Nachname').fill(ADMIN.lastName);
	await page.getByLabel('E-Mail-Adresse').fill(ADMIN.email);
	await page.getByLabel('Handynummer').fill(ADMIN.phone);
	await page.getByLabel('Passwort').fill(ADMIN.password);
	await page.getByLabel('Name', { exact: true }).fill('E2E-Fest 2027');
	await page.getByLabel('Beginn (inkl. Aufbau)').fill('2027-05-24');
	await page.getByLabel('Ende (inkl. Abbau)').fill('2027-06-13');
	await page.getByRole('button', { name: 'Einrichtung abschließen' }).click();

	await expect(page).toHaveURL(/\/admin$/);
	await expect(page.getByRole('heading', { name: 'Verwaltung' })).toBeVisible();

	await page.goto('/admin/areas/new');
	await page.getByLabel('Name (Deutsch)').fill('Aufbau');
	await page.getByRole('button', { name: 'Anlegen' }).click();
	await expect(page).toHaveURL(/\/admin\/areas$/);
	await expect(page.getByText('Aufbau')).toBeVisible();
});

test('lead creates a shift with two positions', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('E-Mail-Adresse').fill(ADMIN.email);
	await page.getByLabel('Passwort').fill(ADMIN.password);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page).toHaveURL(/\/app$/);

	await page.goto('/admin/shifts/new');
	await page.getByLabel('Titel (Deutsch)').fill('Bühnenaufbau');
	await page.getByLabel('Datum', { exact: true }).fill('2027-05-27');
	await page.getByLabel('Beginn', { exact: true }).fill('09:00');
	await page.getByLabel('Ende', { exact: true }).fill('13:00');
	await page.getByRole('button', { name: '+ Position hinzufügen' }).click();
	await page.locator('#pos-1-de').fill('Schichtleitung');
	await page.locator('#pos-1-cap').fill('1');
	await page.getByRole('button', { name: 'Anlegen' }).click();

	await expect(page).toHaveURL(/\/admin\/shifts\/[0-9a-f-]{36}$/);
	await expect(page.getByRole('heading', { name: 'Bühnenaufbau' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Schichtleitung', level: 3 })).toBeVisible();

	await page.goto('/admin/shifts');
	await expect(page.getByText('09:00–13:00')).toBeVisible();
});

// The e2e server runs without SMTP, so no e-mail confirmation is needed.
test('volunteer registers and lands in the app', async ({ page }) => {
	await page.goto('/register');
	await page.getByLabel('Vorname').fill(HELPER.firstName);
	await page.getByLabel('Nachname').fill(HELPER.lastName);
	await page.getByLabel('E-Mail-Adresse').fill(HELPER.email);
	await page.getByLabel('Handynummer').fill(HELPER.phone);
	await page.getByLabel('Passwort').fill(HELPER.password);
	await page.getByRole('button', { name: 'Konto erstellen' }).click();

	await expect(page).toHaveURL(/\/app$/);
	await expect(page.getByRole('heading', { name: `Hallo ${HELPER.firstName}!` })).toBeVisible();
});

test('admin connects an AI assistant via OAuth and plans with it', async ({ page, request }) => {
	const meta = await (await request.get('/.well-known/oauth-protected-resource/mcp')).json();
	expect(meta.resource).toBe('http://localhost:4173/mcp');
	const server = await (await request.get('/.well-known/oauth-authorization-server')).json();

	// Dynamic client registration, as Claude does it.
	const redirect = 'http://localhost:4999/callback';
	const registered = await request.post(server.registration_endpoint, {
		data: { client_name: 'E2E Assistant', redirect_uris: [redirect] }
	});
	expect(registered.status()).toBe(201);
	const { client_id } = await registered.json();

	const verifier = randomBytes(32).toString('base64url');
	const challenge = createHash('sha256').update(verifier).digest('base64url');

	await page.goto('/login');
	await page.getByLabel('E-Mail-Adresse').fill(ADMIN.email);
	await page.getByLabel('Passwort').fill(ADMIN.password);
	await page.getByRole('button', { name: 'Anmelden' }).click();
	await expect(page).toHaveURL(/\/app$/);

	const authorize = new URL(server.authorization_endpoint);
	for (const [k, v] of Object.entries({
		client_id,
		redirect_uri: redirect,
		response_type: 'code',
		code_challenge: challenge,
		code_challenge_method: 'S256',
		state: 'e2e-state'
	}))
		authorize.searchParams.set(k, v);
	await page.goto(authorize.toString());
	await expect(page.getByText('„E2E Assistant“ möchte in deinem Namen')).toBeVisible();
	// The redirect back to the "assistant" (nothing listens there; only the URL matters).
	const [callback] = await Promise.all([
		page.waitForRequest((r) => r.url().startsWith(redirect)),
		page.getByRole('button', { name: 'Erlauben' }).click()
	]);
	const back = new URL(callback.url());
	expect(back.searchParams.get('code')).toBeTruthy();
	expect(back.searchParams.get('state')).toBe('e2e-state');

	// Server-to-server form post without Origin header.
	const tokens = await (
		await request.post(server.token_endpoint, {
			form: {
				grant_type: 'authorization_code',
				code: back.searchParams.get('code')!,
				client_id,
				redirect_uri: redirect,
				code_verifier: verifier
			}
		})
	).json();
	expect(tokens.token_type).toBe('Bearer');

	const call = async (name: string, args: object) => {
		const res = await request.post('/mcp', {
			headers: {
				authorization: `Bearer ${tokens.access_token}`,
				accept: 'application/json, text/event-stream'
			},
			data: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }
		});
		expect(res.status()).toBe(200);
		return JSON.parse((await res.json()).result.content[0].text);
	};
	const areas = await call('list_areas', {});
	const aufbau = areas.find((a: { name: string }) => a.name === 'Aufbau');
	const shift = await call('create_shift', {
		areaId: aufbau.id,
		title: 'Per Claude geplant',
		date: '2027-05-28',
		start: '10:00',
		end: '14:00',
		positions: [{ name: 'Team', capacity: 4 }]
	});
	expect(shift.start).toBe('2027-05-28 10:00');

	await page.goto('/admin/audit');
	await expect(page.getByText('KI-Assistent verbunden')).toBeVisible();
});
