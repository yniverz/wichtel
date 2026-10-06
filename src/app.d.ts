// See https://svelte.dev/docs/kit/types#app.d.ts
import type { User } from '#lib/server/db/schema.ts';
import type { Locale } from '#lib/i18n/index.ts';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			sessionId: string | null;
			locale: Locale;
		}
	}
}

export {};
