import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	fullyParallel: false,
	workers: 1,
	use: { baseURL: 'http://localhost:4173', locale: 'de-DE' },
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] } }
	],
	webServer: {
		command: 'npm run build && npm run preview -- --port 4173 --strictPort',
		port: 4173,
		reuseExistingServer: false,
		env: {
			DATABASE_URL: 'pglite://memory',
			SETUP_TOKEN: 'e2e-setup-token',
			PUBLIC_URL: 'http://localhost:4173'
		}
	}
});
