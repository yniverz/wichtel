import type { Tx } from './db/client.ts';
import { auditLog } from './db/schema.ts';

/** Who performs an action – passed into every service function that changes data. */
export interface Actor {
	userId: string | null;
	ip?: string | null;
}

export const SYSTEM: Actor = { userId: null };

export interface AuditInput {
	action: string;
	entityType: string;
	entityId?: string | null;
	editionId?: string | null;
	data?: Record<string, unknown>;
	reason?: string | null;
}

/** Appends an entry to the audit log. Call inside the same transaction as the change itself. */
export async function audit(tx: Tx, actor: Actor, entry: AuditInput): Promise<void> {
	await tx.insert(auditLog).values({
		actorId: actor.userId,
		ip: actor.ip ?? null,
		action: entry.action,
		entityType: entry.entityType,
		entityId: entry.entityId ?? null,
		editionId: entry.editionId ?? null,
		data: entry.data ?? {},
		reason: entry.reason ?? null
	});
}

/** Returns only the keys whose values differ – keeps audit entries small and readable. */
export function diff<T extends Record<string, unknown>>(
	before: T,
	after: Partial<T>
): { before: Partial<T>; after: Partial<T> } | null {
	const b: Partial<T> = {};
	const a: Partial<T> = {};
	for (const key of Object.keys(after) as (keyof T)[]) {
		if (key === 'updatedAt') continue;
		const old = before[key];
		const next = after[key];
		if (JSON.stringify(old) !== JSON.stringify(next)) {
			b[key] = old;
			a[key] = next;
		}
	}
	return Object.keys(a).length ? { before: b, after: a } : null;
}
