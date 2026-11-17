import { defineEnvVars } from '@sveltejs/kit/env';

export const MIN_SETUP_TOKEN = 24;

/** Whoever knows the setup token can become admin before setup is done; refuse guessable ones. */
export function setupToken(value: string | undefined): string | undefined {
	const token = value === '' ? undefined : value;
	if (token && token.length < MIN_SETUP_TOKEN && process.env.NODE_ENV === 'production')
		throw new Error(
			`SETUP_TOKEN must be at least ${MIN_SETUP_TOKEN} characters (or leave it empty for a random one)`
		);
	return token;
}

const optional = (value: string | undefined) => (value === '' ? undefined : value);

/**
 * Links in e-mails and the scheme of direct http access are built from it, and the app is always
 * served at the root of its host (there is no base path), so only scheme, host and port are allowed.
 */
export function publicUrl(value: string | undefined): string {
	const raw = (optional(value) ?? 'http://localhost:5173').trim().replace(/\/+$/, '');
	const example = 'e.g. https://helfen.example.de';
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new Error(
			`PUBLIC_URL must be an absolute URL starting with https:// or http:// (${example})`
		);
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:')
		throw new Error(`PUBLIC_URL must start with https:// or http:// (${example})`);
	if (url.username || url.password || url.pathname !== '/' || url.search || url.hash)
		throw new Error(
			`PUBLIC_URL must not contain a path, query or user name – Wichtel runs at the root of its own (sub)domain (${example})`
		);
	return url.origin;
}

export const variables = defineEnvVars({
	DATABASE_URL: {
		description:
			'PostgreSQL connection string, or `pglite://<dir>` / `pglite://memory` for an embedded database (development only).',
		schema: (value) => optional(value) ?? 'pglite://./data/dev-db'
	},
	PUBLIC_URL: {
		description:
			'Public base URL used in e-mails, e.g. https://helfen.example.de (scheme, host and optional port only).',
		schema: publicUrl
	},
	PROTOCOL_HEADER: {
		description:
			'Read by the Node adapter (e.g. x-forwarded-proto behind a reverse proxy). Without that header in a request, the scheme of PUBLIC_URL is used.',
		schema: (value) => optional(value?.trim())?.toLowerCase()
	},
	UPLOAD_DIR: {
		description: 'Directory for uploaded files (logos, backgrounds, …).',
		schema: (value) => optional(value) ?? './data/uploads'
	},
	SETUP_TOKEN: {
		description:
			'Optional fixed token for the first-run setup page (at least 24 characters). If unset, a random token is printed to the log.',
		schema: setupToken
	},
	SMTP_HOST: {
		description:
			'SMTP server. If unset, e-mails are printed to the log and new accounts need no e-mail confirmation.',
		schema: optional
	},
	SMTP_PORT: {
		schema: (value) => {
			const port = Number(optional(value) ?? '587');
			if (!Number.isInteger(port)) throw new Error('SMTP_PORT must be an integer');
			return port;
		}
	},
	SMTP_SECURE: {
		description: 'Use implicit TLS (usually port 465).',
		schema: (value) => value === 'true' || value === '1'
	},
	SMTP_USER: { schema: optional },
	SMTP_PASSWORD: { schema: optional },
	LOG_LEVEL: {
		description: 'debug, info (default), warn or error.',
		schema: (value) => {
			const level = optional(value) ?? 'info';
			if (!['debug', 'info', 'warn', 'error'].includes(level))
				throw new Error('LOG_LEVEL must be debug, info, warn or error');
			return level as 'debug' | 'info' | 'warn' | 'error';
		}
	},
	LOG_FORMAT: {
		description: '`json` (one JSON object per line) or `text`. Default: json in production.',
		schema: (value) => {
			const format = optional(value);
			if (format !== undefined && format !== 'json' && format !== 'text')
				throw new Error('LOG_FORMAT must be json or text');
			return format;
		}
	},
	LOG_MAIL_BODIES: {
		description:
			'Without SMTP_HOST: also log the text of e-mails (contains password-reset links). Default: only in development.',
		schema: (value) =>
			optional(value) === undefined ? undefined : value === 'true' || value === '1'
	},
	SMTP_FROM: {
		description:
			'Sender address, e.g. "Wichtel <helfen@example.de>". Set it whenever SMTP_HOST is set: the fallback is rejected by most mail servers.',
		schema: optional
	}
});
