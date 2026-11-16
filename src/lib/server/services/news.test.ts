import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { Authz } from '#lib/domain/permissions.ts';
import type { NewsTarget } from '#lib/domain/news.ts';
import type { Database } from '../db/client.ts';
import { emailOutbox, roleAssignments, roles, users } from '../db/schema.ts';
import { DomainError } from '../errors.ts';
import { createTestDatabase } from '../testing/db.ts';
import { register } from './accounts.ts';
import { createArea } from './areas.ts';
import { bookPosition } from './assignments.ts';
import { createEdition } from './editions.ts';
import {
	deleteNews,
	feed,
	markNewsSeen,
	publishNews,
	readable,
	recipients,
	unreadCount,
	updateNews,
	type NewsInput
} from './news.ts';
import { invalidateSettingsCache } from './settings.ts';
import { createShift, deleteShift, getShift } from './shifts.ts';

let database: Database;
const actor = { userId: null };
beforeEach(async () => {
	invalidateSettingsCache();
	database = await createTestDatabase();
});
afterEach(async () => {
	invalidateSettingsCache();
	await database.close();
});

async function expectDomainError(promise: Promise<unknown>, code: string) {
	await expect(promise).rejects.toSatisfy((e) => e instanceof DomainError && e.code === code);
}

async function seed() {
	const db = database.db;
	const edition = await createEdition(db, actor, {
		name: 'Fest',
		startsOn: '2027-06-01',
		endsOn: '2027-06-30'
	});
	const other = await createEdition(db, actor, {
		name: 'Alt',
		startsOn: '2026-06-01',
		endsOn: '2026-06-30'
	});
	const area = (editionId: string, nameDe: string, parentId: string | null) =>
		createArea(db, actor, editionId, {
			parentId,
			nameDe,
			nameEn: '',
			descriptionDe: '',
			descriptionEn: '',
			sortOrder: 0,
			cancelDeadlineHours: null,
			pointsPerShift: null,
			pointsPerHour: null
		});
	const infra = await area(edition.id, 'Infrastruktur', null);
	const aufbau = await area(edition.id, 'Aufbau', infra.id);
	const bar = await area(edition.id, 'Bar', null);
	const foreignArea = await area(other.id, 'Alt-Bar', null);
	const person = async (email: string, locale: 'de' | 'en') => {
		const user = await register(
			{ db, baseUrl: 'http://test', skipEmailVerification: true },
			{
				email,
				password: 'password 1234',
				firstName: email.split('@')[0],
				lastName: 'Y',
				phone: '1',
				locale
			}
		);
		return { ...user, isAdmin: false };
	};
	const kim = await person('kim@x.org', 'de');
	const sam = await person('sam@x.org', 'en');
	const lou = await person('lou@x.org', 'de');
	const lea = await person('lea@x.org', 'de');
	const nobody = await person('nobody@x.org', 'de');
	const shiftIn = async (editionId: string, areaId: string) => {
		const s = await createShift(db, actor, editionId, {
			areaId,
			titleDe: 'S',
			titleEn: '',
			descriptionDe: '',
			descriptionEn: '',
			location: '',
			meetingPoint: '',
			contact: '',
			visibility: 'public',
			cancelDeadlineHours: null,
			startsAt: new Date('2027-06-12T10:00:00Z'),
			endsAt: new Date('2027-06-12T14:00:00Z'),
			positions: [
				{
					nameDe: 'H',
					nameEn: '',
					descriptionDe: '',
					descriptionEn: '',
					capacity: 5,
					bookingMode: 'open'
				}
			]
		});
		return (await getShift(db, s.id))!;
	};
	const aufbauShift = await shiftIn(edition.id, aufbau.id);
	const barShift = await shiftIn(edition.id, bar.id);
	const foreignShift = await shiftIn(other.id, foreignArea.id);
	const book = (userId: string, positionId: string) =>
		bookPosition({ db, now: new Date() }, userId, positionId, {
			editionId: edition.id,
			canSee: () => true
		});
	await book(kim.id, aufbauShift.positions[0].id);
	await book(sam.id, aufbauShift.positions[0].id);
	await book(lou.id, barShift.positions[0].id);
	// Lea leads the bar.
	const [leadRole] = await db.insert(roles).values({ nameDe: 'Leitung' }).returning();
	await db
		.insert(roleAssignments)
		.values({ userId: lea.id, roleId: leadRole.id, editionId: edition.id, areaId: bar.id });

	const lineage = (id: string) => (id === aufbau.id ? [aufbau.id, infra.id] : [id]);
	const admin = new Authz(true, [], lineage);
	const barLead = new Authz(false, [{ areaId: bar.id, permissions: ['mail.send'] }], lineage);
	const input = (target: Partial<NewsTarget>, extra: Partial<NewsInput> = {}): NewsInput => ({
		audience: 'everyone',
		areaId: null,
		shiftId: null,
		roleId: null,
		titleDe: 'Treffpunkt geändert',
		titleEn: 'Meeting point changed',
		bodyDe: 'Wir treffen uns am Tor 3.',
		bodyEn: 'We meet at gate 3.',
		pinned: false,
		pinnedUntil: null,
		...target,
		...extra
	});
	const sees = async (user: { id: string } | null, postId: string) =>
		(await feed(db, user, edition.id, new Date())).some((p) => p.id === postId);
	return {
		db,
		edition,
		infra,
		aufbau,
		bar,
		foreignArea,
		aufbauShift,
		barShift,
		foreignShift,
		kim,
		sam,
		lou,
		lea,
		nobody,
		leadRole,
		admin,
		barLead,
		input,
		sees
	};
}

describe('news', () => {
	it('e-mails the people of an area subtree in their language', async () => {
		const s = await seed();
		await s.db.delete(emailOutbox);
		const { post, mailed } = await publishNews(
			s.db,
			actor,
			s.admin,
			s.edition.id,
			s.input({ audience: 'area', areaId: s.infra.id }),
			true
		);
		expect(mailed).toBe(2);
		const mails = await s.db.select().from(emailOutbox);
		const byTo = Object.fromEntries(mails.map((m) => [m.to, m]));
		expect(Object.keys(byTo).sort()).toEqual(['kim@x.org', 'sam@x.org']);
		expect(byTo['kim@x.org'].subject).toBe('Treffpunkt geändert');
		expect(byTo['kim@x.org'].text).toContain('Hallo kim');
		expect(byTo['kim@x.org'].text).toContain('Wir treffen uns am Tor 3.');
		expect(byTo['kim@x.org'].text).toContain(`/app/news/${post.id}`);
		expect(byTo['sam@x.org'].subject).toBe('Meeting point changed');
		expect(byTo['sam@x.org'].text).toContain('We meet at gate 3.');
	});

	it('shows a post to exactly the people it e-mails', async () => {
		const s = await seed();
		const targets: Partial<NewsTarget>[] = [
			{ audience: 'everyone' },
			{ audience: 'helpers' },
			{ audience: 'crew' },
			{ audience: 'role', roleId: s.leadRole.id },
			{ audience: 'area', areaId: s.infra.id },
			{ audience: 'area', areaId: s.bar.id },
			{ audience: 'shift', shiftId: s.barShift.id }
		];
		const people = [s.kim, s.sam, s.lou, s.lea, s.nobody];
		for (const target of targets) {
			const { post } = await publishNews(
				s.db,
				actor,
				s.admin,
				s.edition.id,
				s.input(target),
				false
			);
			const mailed = (await recipients(s.db, s.edition.id, post)).map((u) => u.id).sort();
			const seeing = [];
			for (const p of people) if (await s.sees(p, post.id)) seeing.push(p.id);
			expect(seeing.sort(), target.audience).toEqual(
				mailed.filter((id) => people.some((p) => p.id === id))
			);
			expect(await s.sees(null, post.id)).toBe(false);
		}
	});

	it('shows public posts without an account', async () => {
		const s = await seed();
		const { post } = await publishNews(
			s.db,
			actor,
			s.admin,
			s.edition.id,
			s.input({ audience: 'public' }),
			false
		);
		const helpers = await publishNews(
			s.db,
			actor,
			s.admin,
			s.edition.id,
			s.input({ audience: 'helpers' }),
			false
		);
		expect(await s.sees(null, post.id)).toBe(true);
		expect(await readable(s.db, null, s.edition.id, post.id)).toBeDefined();
		expect(await readable(s.db, null, s.edition.id, helpers.post.id)).toBeUndefined();
		expect(await readable(s.db, s.nobody, s.edition.id, helpers.post.id)).toBeUndefined();
		expect(await readable(s.db, s.kim, s.edition.id, helpers.post.id)).toBeDefined();
	});

	it('lets an area lead write only to their area and its shifts', async () => {
		const s = await seed();
		const publish = (target: Partial<NewsTarget>) =>
			publishNews(s.db, actor, s.barLead, s.edition.id, s.input(target), false);
		await publish({ audience: 'area', areaId: s.bar.id });
		await publish({ audience: 'shift', shiftId: s.barShift.id });
		for (const target of [
			{ audience: 'area', areaId: s.infra.id },
			{ audience: 'shift', shiftId: s.aufbauShift.id },
			{ audience: 'helpers' },
			{ audience: 'crew' },
			{ audience: 'role', roleId: s.leadRole.id },
			{ audience: 'everyone' },
			{ audience: 'public' }
		] as Partial<NewsTarget>[])
			await expectDomainError(publish(target), 'forbidden');
	});

	it('refuses areas and shifts of another edition', async () => {
		const s = await seed();
		await expectDomainError(
			publishNews(
				s.db,
				actor,
				s.admin,
				s.edition.id,
				s.input({ audience: 'area', areaId: s.foreignArea.id }),
				false
			),
			'notFound'
		);
		await expectDomainError(
			publishNews(
				s.db,
				actor,
				s.admin,
				s.edition.id,
				s.input({ audience: 'shift', shiftId: s.foreignShift.id }),
				false
			),
			'notFound'
		);
	});

	it('keeps leads away from posts outside their areas', async () => {
		const s = await seed();
		const { post } = await publishNews(
			s.db,
			actor,
			s.admin,
			s.edition.id,
			s.input({ audience: 'area', areaId: s.infra.id }),
			false
		);
		await expectDomainError(
			updateNews(
				s.db,
				actor,
				s.barLead,
				s.edition.id,
				post.id,
				s.input({ audience: 'area', areaId: s.bar.id })
			),
			'notFound'
		);
		await expectDomainError(deleteNews(s.db, actor, s.barLead, s.edition.id, post.id), 'notFound');
		// Nor can they move their own post to an audience they may not write to.
		const own = await publishNews(
			s.db,
			actor,
			s.barLead,
			s.edition.id,
			s.input({ audience: 'area', areaId: s.bar.id }),
			false
		);
		await expectDomainError(
			updateNews(
				s.db,
				actor,
				s.barLead,
				s.edition.id,
				own.post.id,
				s.input({ audience: 'everyone' })
			),
			'forbidden'
		);
	});

	it('does not e-mail again when a post is corrected', async () => {
		const s = await seed();
		const { post } = await publishNews(
			s.db,
			actor,
			s.admin,
			s.edition.id,
			s.input({ audience: 'helpers' }),
			true
		);
		await s.db.delete(emailOutbox);
		await updateNews(
			s.db,
			actor,
			s.admin,
			s.edition.id,
			post.id,
			s.input({ audience: 'helpers' }, { titleDe: 'Korrektur' })
		);
		expect(await s.db.select().from(emailOutbox)).toEqual([]);
		expect((await feed(s.db, s.kim, s.edition.id, new Date()))[0].titleDe).toBe('Korrektur');
	});

	it('reaches nobody once the shift is deleted', async () => {
		const s = await seed();
		const { post } = await publishNews(
			s.db,
			actor,
			s.admin,
			s.edition.id,
			s.input({ audience: 'shift', shiftId: s.barShift.id }),
			false
		);
		expect(await s.sees(s.lou, post.id)).toBe(true);
		await deleteShift(s.db, actor, s.barShift.id);
		expect(await s.sees(s.lou, post.id)).toBe(false);
		expect(await recipients(s.db, s.edition.id, { ...post, shiftId: null })).toEqual([]);
	});

	it('counts unread posts until the news are opened', async () => {
		const s = await seed();
		await publishNews(s.db, actor, s.admin, s.edition.id, s.input({ audience: 'helpers' }), false);
		await publishNews(s.db, actor, s.admin, s.edition.id, s.input({ audience: 'crew' }), false);
		const kimNow = async () => (await s.db.select().from(users).where(eq(users.id, s.kim.id)))[0];
		expect(await unreadCount(s.db, await kimNow(), s.edition.id, new Date())).toBe(1);
		await markNewsSeen(s.db, s.kim.id, new Date());
		expect(await unreadCount(s.db, await kimNow(), s.edition.id, new Date())).toBe(0);
	});
});
