import { afterEach, describe, expect, it } from 'vitest';
import { configureLog } from './log.ts';
import { createConsoleMailer } from './mail.ts';

const message = {
	to: 'kim@example.org',
	subject: 'Passwort zurücksetzen',
	text: 'Link: https://helfen.example/reset?token=secret',
	html: ''
};

async function logged(withBodies: boolean): Promise<string> {
	const lines: string[] = [];
	configureLog({ format: 'json', write: (line) => lines.push(line) });
	await createConsoleMailer(withBodies).send(message);
	return lines.join('\n');
}

describe('console mailer', () => {
	afterEach(() => configureLog({ format: 'text', write: (line) => console.log(line) }));

	it('logs neither the address nor the text by default', async () => {
		const line = await logged(false);
		expect(line).toContain('Passwort zurücksetzen');
		expect(line).not.toContain('kim@example.org');
		expect(line).not.toContain('secret');
	});

	it('logs both with LOG_MAIL_BODIES (development)', async () => {
		const line = await logged(true);
		expect(line).toContain('kim@example.org');
		expect(line).toContain('token=secret');
	});
});
