import { and, desc, eq, lt } from 'drizzle-orm';
import type { Tx } from '../db/client.ts';
import { auditLog, users } from '../db/schema.ts';

export const AUDIT_PAGE_SIZE = 100;

export async function listAuditEntries(
	db: Tx,
	opts: { editionId?: string | null; before?: number } = {}
) {
	const conditions = [];
	if (opts.editionId) conditions.push(eq(auditLog.editionId, opts.editionId));
	if (opts.before) conditions.push(lt(auditLog.id, opts.before));
	return db
		.select({
			id: auditLog.id,
			createdAt: auditLog.createdAt,
			action: auditLog.action,
			entityType: auditLog.entityType,
			entityId: auditLog.entityId,
			data: auditLog.data,
			reason: auditLog.reason,
			actorFirstName: users.firstName,
			actorLastName: users.lastName
		})
		.from(auditLog)
		.leftJoin(users, eq(auditLog.actorId, users.id))
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(auditLog.id))
		.limit(AUDIT_PAGE_SIZE);
}
