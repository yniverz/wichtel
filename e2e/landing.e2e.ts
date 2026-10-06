import { expect, test } from '@playwright/test';

test('landing page works on every viewport', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Ich habe schon ein Konto' })).toBeVisible();
	// No horizontal scrolling on small screens.
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - window.innerWidth
	);
	expect(overflow).toBeLessThanOrEqual(0);
});
