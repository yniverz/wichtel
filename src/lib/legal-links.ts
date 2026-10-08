import type { PublicSettings } from '#lib/server/services/settings.ts';

/** Where the legal notice and privacy policy live: our own pages, or external links. */
export function legalLinks(settings: PublicSettings | undefined) {
	return {
		imprint: settings?.hasImprint ? '/legal/imprint' : settings?.imprintUrl || null,
		privacy: settings?.hasPrivacy ? '/legal/privacy' : settings?.privacyUrl || null
	};
}
