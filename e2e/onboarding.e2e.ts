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

test('volunteer registers and is asked to confirm the e-mail address', async ({ page }) => {
	await page.goto('/register');
	await page.getByLabel('Vorname').fill(HELPER.firstName);
	await page.getByLabel('Nachname').fill(HELPER.lastName);
	await page.getByLabel('E-Mail-Adresse').fill(HELPER.email);
	await page.getByLabel('Handynummer').fill(HELPER.phone);
	await page.getByLabel('Passwort').fill(HELPER.password);
	await page.getByRole('button', { name: 'Konto erstellen' }).click();

	await expect(page).toHaveURL(/\/app$/);
	await expect(
		page.getByRole('heading', { name: 'Bitte bestätige deine E-Mail-Adresse' })
	).toBeVisible();
});
