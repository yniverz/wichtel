import { and, desc, eq, gt, inArray, isNull } from 'drizzle-orm';
import { feedOrder, mayPublish, reaches, type NewsTarget, type Reader } from '#lib/domain/news.ts';
import type { Authz } from '#lib/domain/permissions.ts';
import { localized, translator } from '#lib/i18n/index.ts';
import type { DB, Tx } from '../db/client.ts';
import {
	assignments,
	news,
	roleAssignments,
	roles,
	shifts,
	users,
	type News,
	type User
} from '../db/schema.ts';
import { audit, type Actor } from '../audit.ts';
import { DomainError } from '../errors.ts';
import { appUrl, enqueueMail } from '../notifications.ts';
import { loadAreaTree } from './areas.ts';
import { getSettings } from './settings.ts';

/** Bookings that make someone part of a shift's (and its area's) audience. */
const ACTIVE = ['booked', 'requested'] as const;

export interface NewsInput extends NewsTarget {
	titleDe: string;
	titleEn: string;
	bodyDe: string;
	bodyEn: string;
	pinned: boolean;
	pinnedUntil: Date | null;
}

/** What decides which posts the person sees in this edition. */
export async function readerOf(db: Tx, userId: string, editionId: string): Promise<Reader> {
	const [roleRows, shiftRows] = await Promise.all([
		db
			.select({ roleId: roleAssignments.roleId })
			.from(roleAssignments)
			.where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.editionId, editionId))),
		db
			.select({ shiftId: shifts.id, areaId: shifts.areaId })
			.from(assignments)
			.innerJoin(shifts, eq(assignments.shiftId, shifts.id))
			.where(
				and(
					eq(assignments.userId, userId),
					eq(shifts.editionId, editionId),
					inArray(assignments.status, [...ACTIVE])
				)
			)
	]);
	return {
		crew: roleRows.length > 0,
		roleIds: new Set(roleRows.map((r) => r.roleId)),
		shiftIds: new Set(shiftRows.map((r) => r.shiftId)),
		areaIds: new Set(shiftRows.map((r) => r.areaId))
	};
}

/**
 * The posts of the edition the person sees (null = not signed in: only public posts), pinned
 * first, then the newest. `since` only looks at posts published after it.
 */
export async function feed(
	db: Tx,
	user: { id: string } | null,
	editionId: string,
	now: Date,
	since: Date | null = null
): Promise<News[]> {
	const conditions = [eq(news.editionId, editionId)];
	if (!user) conditions.push(eq(news.audience, 'public'));
	if (since) conditions.push(gt(news.publishedAt, since));
	const posts = await db
		.select()
		.from(news)
		.where(and(...conditions))
		.orderBy(desc(news.publishedAt));
	if (posts.length === 0) return [];
	if (!user) return feedOrder(posts, now);
	const [reader, tree] = await Promise.all([
		readerOf(db, user.id, editionId),
		loadAreaTree(db, editionId)
	]);
	return feedOrder(
		posts.filter((p) => reaches(p, reader, (a, b) => tree.isWithin(a, b))),
		now
	);
}

/** One post, if the person (null = not signed in) may read it. */
export async function readable(
	db: Tx,
	user: { id: string } | null,
	editionId: string,
	id: string
): Promise<News | undefined> {
	const [post] = await db
		.select()
		.from(news)
		.where(and(eq(news.id, id), eq(news.editionId, editionId)));
	if (!post) return undefined;
	if (post.audience === 'public') return post;
	if (!user) return undefined;
	const [reader, tree] = await Promise.all([
		readerOf(db, user.id, editionId),
		loadAreaTree(db, editionId)
	]);
	return reaches(post, reader, (a, b) => tree.isWithin(a, b)) ? post : undefined;
}

/** Posts published since the person last opened the news. */
export async function unreadCount(
	db: Tx,
	user: { id: string; newsSeenAt: Date | null },
	editionId: string,
	now: Date
): Promise<number> {
	return (await feed(db, user, editionId, now, user.newsSeenAt)).length;
}

export async function markNewsSeen(db: Tx, userId: string, at: Date) {
	await db.update(users).set({ newsSeenAt: at }).where(eq(users.id, userId));
}

/** The people a post reaches right now, each once (for the e-mail). */
export async function recipients(db: Tx, editionId: string, target: NewsTarget): Promise<User[]> {
	const active = isNull(users.deletedAt);
	if (target.audience === 'public' || target.audience === 'everyone') {
		return db.select().from(users).where(active);
	}
	let ids: string[];
	if (target.audience === 'crew' || target.audience === 'role') {
		if (target.audience === 'role' && !target.roleId) return [];
		ids = (
			await db
				.select({ id: roleAssignments.userId })
				.from(roleAssignments)
				.where(
					and(
						eq(roleAssignments.editionId, editionId),
						...(target.audience === 'role' ? [eq(roleAssignments.roleId, target.roleId!)] : [])
					)
				)
		).map((r) => r.id);
	} else {
		const conditions = [eq(shifts.editionId, editionId), inArray(assignments.status, [...ACTIVE])];
		if (target.audience === 'shift') {
			if (!target.shiftId) return [];
			conditions.push(eq(shifts.id, target.shiftId));
		}
		if (target.audience === 'area') {
			if (!target.areaId) return [];
			const tree = await loadAreaTree(db, editionId);
			conditions.push(inArray(shifts.areaId, [...tree.covered([target.areaId])]));
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
	return db
		.select()
		.from(users)
		.where(and(inArray(users.id, unique), active));
}

/**
 * Checks that the target belongs to the edition and that the person may write to it. Returns
 * the target with only the id its audience uses.
 */
async function checkTarget(
	tx: Tx,
	authz: Authz,
	editionId: string,
	target: NewsTarget
): Promise<NewsTarget> {
	const clean: NewsTarget = {
		audience: target.audience,
		areaId: target.audience === 'area' ? target.areaId : null,
		shiftId: target.audience === 'shift' ? target.shiftId : null,
		roleId: target.audience === 'role' ? target.roleId : null
	};
	let shiftAreaId: string | null = null;
	if (clean.audience === 'area') {
		const tree = await loadAreaTree(tx, editionId);
		if (!clean.areaId || !tree.has(clean.areaId)) throw new DomainError('notFound', 'areaId');
	} else if (clean.audience === 'shift') {
		const [shift] = clean.shiftId
			? await tx
					.select({ areaId: shifts.areaId })
					.from(shifts)
					.where(and(eq(shifts.id, clean.shiftId), eq(shifts.editionId, editionId)))
			: [];
		if (!shift) throw new DomainError('notFound', 'shiftId');
		shiftAreaId = shift.areaId;
	} else if (clean.audience === 'role') {
		const [role] = clean.roleId
			? await tx.select({ id: roles.id }).from(roles).where(eq(roles.id, clean.roleId))
			: [];
		if (!role) throw new DomainError('notFound', 'roleId');
	}
	if (!mayPublish(authz, clean, shiftAreaId)) throw new DomainError('forbidden');
	return clean;
}

/** Whether the person may edit or delete an existing post (it may target something deleted). */
export async function mayManage(db: Tx, authz: Authz, post: News): Promise<boolean> {
	if (authz.isAdmin) return true;
	let shiftAreaId: string | null = null;
	if (post.audience === 'shift' && post.shiftId) {
		const [shift] = await db
			.select({ areaId: shifts.areaId })
			.from(shifts)
			.where(eq(shifts.id, post.shiftId));
		shiftAreaId = shift?.areaId ?? null;
	}
	return mayPublish(authz, post, shiftAreaId);
}

/** All posts of the edition the person may edit, newest first. */
export async function manageableNews(db: Tx, authz: Authz, editionId: string) {
	const rows = await db
		.select({
			post: news,
			shiftAreaId: shifts.areaId,
			authorFirst: users.firstName,
			authorLast: users.lastName
		})
		.from(news)
		.leftJoin(shifts, eq(news.shiftId, shifts.id))
		.leftJoin(users, eq(news.authorId, users.id))
		.where(eq(news.editionId, editionId))
		.orderBy(desc(news.publishedAt));
	return rows
		.filter((r) => mayPublish(authz, r.post, r.shiftAreaId))
		.map((r) => ({
			...r.post,
			author: r.authorFirst ? `${r.authorFirst} ${r.authorLast}` : null
		}));
}

export function postUrl(post: Pick<News, 'id' | 'audience'>) {
	return post.audience === 'public' ? `/news/${post.id}` : `/app/news/${post.id}`;
}

/**
 * Publishes a post. With `sendMail`, everyone it reaches right now also gets it by e-mail, in
 * their language where a translation exists.
 */
export async function publishNews(
	db: DB,
	actor: Actor,
	authz: Authz,
	editionId: string,
	input: NewsInput,
	sendMail: boolean
): Promise<{ post: News; mailed: number | null }> {
	return db.transaction(async (tx) => {
		const target = await checkTarget(tx, authz, editionId, input);
		const [post] = await tx
			.insert(news)
			.values({ ...input, ...target, editionId, authorId: actor.userId })
			.returning();
		let mailed: number | null = null;
		if (sendMail) {
			const settings = await getSettings(tx);
			const people = await recipients(tx, editionId, target);
			for (const person of people) {
				const t = translator(person.locale);
				const body = localized(post, 'body', person.locale);
				await enqueueMail(tx, {
					to: person.email,
					subject: localized(post, 'title', person.locale),
					text: [
						t('news.mail.greeting', { name: person.firstName }),
						body,
						t('news.mail.link', { link: appUrl(postUrl(post)) }),
						t('news.mail.signature', { festival: settings.festivalName })
					].join('\n\n')
				});
			}
			mailed = people.length;
			await tx.update(news).set({ mailed }).where(eq(news.id, post.id));
		}
		await audit(tx, actor, {
			action: 'news.publish',
			entityType: 'news',
			entityId: post.id,
			editionId,
			data: { title: post.titleDe, audience: target, mailed }
		});
		return { post: { ...post, mailed }, mailed };
	});
}

/** Corrects a post. Nothing is e-mailed again. */
export async function updateNews(
	db: DB,
	actor: Actor,
	authz: Authz,
	editionId: string,
	id: string,
	input: NewsInput
): Promise<void> {
	await db.transaction(async (tx) => {
		const [before] = await tx
			.select()
			.from(news)
			.where(and(eq(news.id, id), eq(news.editionId, editionId)));
		if (!before || !(await mayManage(tx, authz, before))) throw new DomainError('notFound');
		const target = await checkTarget(tx, authz, editionId, input);
		await tx
			.update(news)
			.set({ ...input, ...target, updatedAt: new Date() })
			.where(eq(news.id, id));
		await audit(tx, actor, {
			action: 'news.update',
			entityType: 'news',
			entityId: id,
			editionId,
			data: { title: input.titleDe, audience: target }
		});
	});
}

export async function deleteNews(
	db: DB,
	actor: Actor,
	authz: Authz,
	editionId: string,
	id: string
): Promise<void> {
	await db.transaction(async (tx) => {
		const [post] = await tx
			.select()
			.from(news)
			.where(and(eq(news.id, id), eq(news.editionId, editionId)));
		if (!post || !(await mayManage(tx, authz, post))) throw new DomainError('notFound');
		await tx.delete(news).where(eq(news.id, id));
		await audit(tx, actor, {
			action: 'news.delete',
			entityType: 'news',
			entityId: id,
			editionId,
			data: { title: post.titleDe }
		});
	});
}
