import { and, eq } from 'drizzle-orm';
import type { DB, Tx } from '../db/client.ts';
import { mailTemplates } from '../db/schema.ts';
import { audit, type Actor } from '../audit.ts';
import type { MailTemplate } from '../notifications.ts';

export async function saveTemplate(
	db: DB,
	actor: Actor,
	input: { key: MailTemplate; locale: 'de' | 'en'; subject: string; body: string }
) {
	await db.transaction(async (tx) => {
		await tx
			.insert(mailTemplates)
			.values(input)
			.onConflictDoUpdate({
				target: [mailTemplates.key, mailTemplates.locale],
				set: { subject: input.subject, body: input.body }
			});
		await audit(tx, actor, {
			action: 'mail.template_update',
			entityType: 'mail_template',
			entityId: `${input.key}:${input.locale}`
		});
	});
}

export async function resetTemplate(db: DB, actor: Actor, key: MailTemplate, locale: 'de' | 'en') {
	await db.transaction(async (tx) => {
		await tx
			.delete(mailTemplates)
			.where(and(eq(mailTemplates.key, key), eq(mailTemplates.locale, locale)));
		await audit(tx, actor, {
			action: 'mail.template_reset',
			entityType: 'mail_template',
			entityId: `${key}:${locale}`
		});
	});
}

export function listTemplateOverrides(db: Tx) {
	return db.select().from(mailTemplates);
}
