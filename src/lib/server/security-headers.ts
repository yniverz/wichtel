/**
 * Security headers for pages. The Content-Security-Policy itself comes from SvelteKit
 * (`csp` in vite.config.ts, with nonces for its own scripts); here the parts that depend on the
 * settings are added: the map tile server and where the OAuth consent form may send people.
 */

/** CSP source for a tile URL template, e.g. `https://{s}.tile.example.org/…` → `https://*.tile.example.org`. */
export function tileSource(template: string): string | null {
	const host = /^https:\/\/([^/]+)/.exec(template)?.[1];
	if (!host) return null;
	const source = host.replace(/^\{[^}]+\}\./, '*.');
	// CSP only allows a wildcard as the first label; anything else falls back to the whole scheme.
	return /[{}]/.test(source) ? 'https:' : `https://${source}`;
}

/** Targets of the consent form's redirect: allowed hosts and apps on this machine. */
export function redirectSources(hosts: readonly string[]): string[] {
	return [
		...hosts.flatMap((h) => [`https://${h}`, `https://*.${h}`]),
		'http://localhost:*',
		'https://localhost:*',
		'http://127.0.0.1:*'
	];
}

/** Adds sources to directives of an existing policy. */
export function extendCsp(policy: string, extra: Record<string, string[]>): string {
	const directives = policy
		.split(';')
		.map((d) => d.trim())
		.filter(Boolean)
		.map((d) => {
			const [name, ...values] = d.split(/\s+/);
			const add = extra[name] ?? [];
			return [name, ...values, ...add.filter((v) => !values.includes(v))].join(' ');
		});
	return directives.join('; ');
}

export const PERMISSIONS_POLICY =
	'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()';
export const HSTS = 'max-age=31536000; includeSubDomains';
