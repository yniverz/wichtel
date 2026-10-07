import { and, eq, inArray } from 'drizzle-orm';
import type { DB, Tx } from '../db/client.ts';
import {
	assignments,
	mailTemplates,
	roleAssignments,
	shifts,
	users,
	type User
} from '../db/schema.ts';
import { audit, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { enqueueMail, type MailTemplate } from '../notifications.ts';
import { loadAreaTree } from './areas.ts';
import { getSettings } from './settings.ts';

export type Audience =
	| { kind: 'area'; areaId: string }
	| { kind: 'shift'; shiftId: string }
	| { kind: 'helpers' }
	| { kind: 'crew' }
	| { kind: 'everyone' };

const ACTIVE = ['booked', 'requested'] as const;

/** Resolves an audience to the people it reaches (each person once). */
export async function recipients(db: Tx, editionId: string, audience: Audience): Promise<User[]> {
	let ids: string[];
	if (audience.kind === 'everyone') {
		return db.select().from(users);
	}
	if (audience.kind === 'crew') {
		ids = (
			await db
				.select({ id: roleAssignments.userId })
				.from(roleAssignments)
				.where(eq(roleAssignments.editionId, editionId))
		).map((r) => r.id);
	} else {
		const conditions = [eq(shifts.editionId, editionId), inArray(assignments.status, [...ACTIVE])];
		if (audience.kind === 'shift') conditions.push(eq(shifts.id, audience.shiftId));
		if (audience.kind === 'area') {
			const tree = await loadAreaTree(db, editionId);
			if (!tree.has(audience.areaId)) throw new DomainError('notFound', 'areaId');
			conditions.push(inArray(shifts.areaId, [...tree.covered([audience.areaId])]));
		}
		ids = (
			await db
				.select({ id: assignments.userId })
				.from(assignments)
				.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
				.where(and(...conditions))
		).map((r) => r.id);
	}
	const unique = [...new Set(ids)];
	if (unique.length === 0) return [];
	return db.select().from(users).where(inArray(users.id, unique));
}

/** Sends a message to everyone in the audience, in their language where a translation exists. */
export async function sendBroadcast(
	db: DB,
	actor: Actor,
	input: {
		editionId: string;
		audience: Audience;
		subjectDe: string;
		bodyDe: string;
		subjectEn: string;
		bodyEn: string;
	}
): Promise<number> {
	return db.transaction(async (tx) => {
		const settings = await getSettings(tx);
		const people = await recipients(tx, input.editionId, input.audience);
		for (const person of people) {
			const en = person.locale === 'en' && input.subjectEn.trim() && input.bodyEn.trim();
			const fill = (text: string) =>
				text.replace(/\{name\}/g, person.firstName).replace(/\{festival\}/g, settings.festivalName);
			await enqueueMail(tx, {
				to: person.email,
				subject: fill(en ? input.subjectEn : input.subjectDe),
				text: fill(en ? input.bodyEn : input.bodyDe)
			});
		}
		await audit(tx, actor, {
			action: 'mail.broadcast',
			entityType: 'mail',
			editionId: input.editionId,
			data: { audience: input.audience, recipients: people.length, subject: input.subjectDe }
		});
		return people.length;
	});
}

// ---------------------------------------------------------------------------
// Template overrides
// ---------------------------------------------------------------------------

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
