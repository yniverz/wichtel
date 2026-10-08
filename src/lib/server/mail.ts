import nodemailer from 'nodemailer';
import { log } from './log.ts';
import { readableTextColor } from '#lib/domain/color.ts';
import { translator, type Locale, type MessageKey } from '#lib/i18n/index.ts';

export interface MailMessage {
	to: string;
	subject: string;
	text: string;
	html: string;
}

export interface Mailer {
	send(message: MailMessage): Promise<void>;
}

export interface SmtpConfig {
	host: string;
	port: number;
	secure: boolean;
	user?: string;
	password?: string;
	from: string;
}

export function createSmtpMailer(config: SmtpConfig): Mailer {
	const transport = nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		auth: config.user ? { user: config.user, pass: config.password } : undefined
	});
	return {
		async send(message) {
			await transport.sendMail({ from: config.from, ...message });
		}
	};
}

/** Development fallback: prints e-mails to the log instead of sending them. */
export function createConsoleMailer(): Mailer {
	return {
		async send(message) {
			// Development only: the text contains links (e.g. password reset) to click locally.
			log.info('e-mail not sent (SMTP_HOST unset)', {
				to: message.to,
				subject: message.subject,
				text: message.text
			});
		}
	};
}

/** Collects e-mails in memory – for tests. */
export function createMemoryMailer(): Mailer & { sent: MailMessage[] } {
	const sent: MailMessage[] = [];
	return {
		sent,
		async send(message) {
			sent.push(message);
		}
	};
}

const escapeHtml = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);

/** Builds a simple transactional mail with greeting, text, a link button and signature. */
export function linkMail(opts: {
	locale: Locale;
	to: string;
	name: string;
	festival: string;
	primaryColor: string;
	subject: MessageKey;
	body: MessageKey;
	expiry: MessageKey;
	link: string;
}): MailMessage {
	const t = translator(opts.locale);
	const greeting = t('mail.greeting', { name: opts.name });
	const body = t(opts.body, { festival: opts.festival });
	const expiry = t(opts.expiry);
	const ignore = t('mail.ignore');
	const signature = t('mail.signature', { festival: opts.festival });
	const subject = `${t(opts.subject)} · ${opts.festival}`;

	const text = `${greeting}\n\n${body}\n\n${opts.link}\n\n${expiry}\n${ignore}\n\n${signature}`;
	const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1d1b17;max-width:560px;margin:0 auto;padding:24px">
<p>${escapeHtml(greeting)}</p>
<p>${escapeHtml(body)}</p>
<p><a href="${escapeHtml(opts.link)}" style="display:inline-block;background:${escapeHtml(opts.primaryColor)};color:${readableTextColor(opts.primaryColor)};padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:600">${escapeHtml(t(opts.subject))}</a></p>
<p style="font-size:13px;color:#696358;word-break:break-all">${escapeHtml(opts.link)}</p>
<p style="font-size:13px;color:#696358">${escapeHtml(expiry)}<br>${escapeHtml(ignore)}</p>
<p>${escapeHtml(signature)}</p>
</body></html>`;
	return { to: opts.to, subject, text, html };
}
