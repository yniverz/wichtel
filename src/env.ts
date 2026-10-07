import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => (value === '' ? undefined : value);

export const variables = defineEnvVars({
	DATABASE_URL: {
		description:
			'PostgreSQL connection string, or `pglite://<dir>` / `pglite://memory` for an embedded database (development only).',
		schema: (value) => optional(value) ?? 'pglite://./data/dev-db'
	},
	PUBLIC_URL: {
		description: 'Public base URL used in e-mails, e.g. https://helfen.example.de',
		schema: (value) => (optional(value) ?? 'http://localhost:5173').replace(/\/+$/, '')
	},
	UPLOAD_DIR: {
		description: 'Directory for uploaded files (logos, backgrounds, …).',
		schema: (value) => optional(value) ?? './data/uploads'
	},
	SETUP_TOKEN: {
		description:
			'Optional fixed token for the first-run setup page. If unset, a random token is printed to the log.',
		schema: optional
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
	SMTP_FROM: {
		description: 'Sender address, e.g. "Wichtel <helfen@example.de>"',
		schema: (value) => optional(value) ?? 'Wichtel <wichtel@localhost>'
	}
});
