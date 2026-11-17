import { and, asc, count, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import type { Tx } from '../db/client.ts';
import { users, type User } from '../db/schema.ts';

export const PAGE_SIZE = 50;

export type PersonSummary = Pick<
	User,
	'id' | 'email' | 'firstName' | 'lastName' | 'isAdmin' | 'emailVerifiedAt' | 'createdAt'
>;

/**
 * Searches people by name and – only with `matchEmail` – by e-mail address. Viewers who may not
 * see e-mail addresses must not search by them either: a hit would reveal that an address has an
 * account.
 */
export async function searchPeople(
	db: Tx,
	query: string,
	page = 0,
	opts: { matchEmail: boolean } = { matchEmail: false }
): Promise<{ people: PersonSummary[]; total: number }> {
	const q = query.trim();
	const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
	const byName = ilike(sql`${users.firstName} || ' ' || ${users.lastName}`, pattern);
	// Deleted accounts only remain as placeholders behind old bookings.
	const where = and(
		isNull(users.deletedAt),
		q ? (opts.matchEmail ? or(ilike(users.email, pattern), byName) : byName) : undefined
	);
	const [people, [{ total }]] = await Promise.all([
		db
			.select({
				id: users.id,
				email: users.email,
				firstName: users.firstName,
				lastName: users.lastName,
				isAdmin: users.isAdmin,
				emailVerifiedAt: users.emailVerifiedAt,
				createdAt: users.createdAt
			})
			.from(users)
			.where(where)
			.orderBy(asc(users.lastName), asc(users.firstName))
			.limit(PAGE_SIZE)
			.offset(page * PAGE_SIZE),
		db.select({ total: count() }).from(users).where(where)
	]);
	return { people, total };
}

export async function getPerson(db: Tx, id: string): Promise<User | undefined> {
	const [user] = await db.select().from(users).where(eq(users.id, id));
	return user;
}
