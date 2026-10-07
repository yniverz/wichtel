import { and, count, eq, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import type { AreaTree } from '#lib/domain/area-tree.ts';
import { freeSpots } from '#lib/domain/booking.ts';
import { utcToZoned } from '#lib/domain/time.ts';
import type { Tx } from '../db/client.ts';
import { assignments, goodieClaims, users, type Area } from '../db/schema.ts';
import { listShifts } from './shifts.ts';

const HOUR = 3_600_000;

export interface DashboardCell {
	capacity: number;
	booked: number;
}

export interface Dashboard {
	totals: { capacity: number; booked: number; requested: number; people: number; shifts: number };
	/** Fill level per group of areas (rows) and festival day (columns). */
	heatmap: {
		days: string[];
		rows: { areaId: string; nameDe: string; nameEn: string; cells: (DashboardCell | null)[] }[];
	};
	/** Upcoming shifts with free places, soonest first. */
	understaffed: {
		id: string;
		titleDe: string;
		titleEn: string;
		areaNameDe: string;
		areaNameEn: string;
		startsAt: string;
		endsAt: string;
		free: number;
		capacity: number;
		urgent: boolean;
	}[];
	/** Shifts of today with attendance so far. */
	today: {
		id: string;
		titleDe: string;
		titleEn: string;
		startsAt: string;
		endsAt: string;
		booked: number;
		attended: number;
		noShow: number;
	}[];
}

/**
 * Staffing overview for the shifts a lead can see. `scope` limits the areas ('all' for everyone
 * with an edition-wide role). Rows of the heatmap are the topmost visible areas, so a lead of a
 * sub-area sees their own area rather than its parent.
 */
export async function loadDashboard(
	db: Tx,
	editionId: string,
	tree: AreaTree<Area>,
	scope: 'all' | Set<string>,
	timeZone: string,
	now: Date
): Promise<Dashboard> {
	const all = await listShifts(db, editionId, scope === 'all' ? {} : { areaIds: [...scope] });
	const visible = (id: string) => scope === 'all' || scope.has(id);
	// The topmost visible ancestor of an area.
	const rowOf = (areaId: string) =>
		[...tree.lineage(areaId)].reverse().find((id) => visible(id)) ?? areaId;

	const days = [...new Set(all.map((s) => utcToZoned(s.startsAt, timeZone).date))].sort();
	const rows = new Map<string, (DashboardCell | null)[]>();
	let capacity = 0;
	let booked = 0;
	let requested = 0;
	for (const s of all) {
		const row = rowOf(s.areaId);
		const cells = rows.get(row) ?? days.map(() => null);
		const index = days.indexOf(utcToZoned(s.startsAt, timeZone).date);
		const cell = cells[index] ?? { capacity: 0, booked: 0 };
		for (const p of s.positions) {
			cell.capacity += p.capacity;
			cell.booked += Math.min(p.booked, p.capacity);
			capacity += p.capacity;
			booked += Math.min(p.booked, p.capacity);
			requested += p.requested;
		}
		cells[index] = cell;
		rows.set(row, cells);
	}

	const ids = all.map((s) => s.id);
	const [people, attendance] = ids.length
		? await Promise.all([
				db
					.select({ n: sql<number>`count(distinct ${assignments.userId})::int` })
					.from(assignments)
					.where(
						and(inArray(assignments.shiftId, ids), inArray(assignments.status, ['booked', 'held']))
					),
				db
					.select({
						shiftId: assignments.shiftId,
						attendance: assignments.attendance,
						n: count()
					})
					.from(assignments)
					.where(and(inArray(assignments.shiftId, ids), eq(assignments.status, 'booked')))
					.groupBy(assignments.shiftId, assignments.attendance)
			])
		: [[{ n: 0 }], []];
	const attendanceOf = (shiftId: string, value: string) =>
		attendance.find((a) => a.shiftId === shiftId && a.attendance === value)?.n ?? 0;

	const todayDate = utcToZoned(now, timeZone).date;
	const free = (s: (typeof all)[number]) =>
		s.positions.reduce((n, p) => n + freeSpots(p.capacity, p.booked), 0);

	return {
		totals: { capacity, booked, requested, people: people[0]?.n ?? 0, shifts: all.length },
		heatmap: {
			days,
			rows: [...rows.entries()]
				.map(([areaId, cells]) => {
					const area = tree.get(areaId);
					return { areaId, nameDe: area?.nameDe ?? '', nameEn: area?.nameEn ?? '', cells };
				})
				.sort((a, b) => a.nameDe.localeCompare(b.nameDe))
		},
		understaffed: all
			.filter((s) => s.startsAt.getTime() > now.getTime() && free(s) > 0)
			.slice(0, 10)
			.map((s) => {
				const area = tree.get(s.areaId);
				return {
					id: s.id,
					titleDe: s.titleDe,
					titleEn: s.titleEn,
					areaNameDe: area?.nameDe ?? '',
					areaNameEn: area?.nameEn ?? '',
					startsAt: s.startsAt.toISOString(),
					endsAt: s.endsAt.toISOString(),
					free: free(s),
					capacity: s.positions.reduce((n, p) => n + p.capacity, 0),
					urgent: s.positions.some((p) => p.urgentAt !== null)
				};
			}),
		today: all
			.filter((s) => utcToZoned(s.startsAt, timeZone).date === todayDate)
			.map((s) => ({
				id: s.id,
				titleDe: s.titleDe,
				titleEn: s.titleEn,
				startsAt: s.startsAt.toISOString(),
				endsAt: s.endsAt.toISOString(),
				booked: s.positions.reduce((n, p) => n + p.booked, 0),
				attended: attendanceOf(s.id, 'attended'),
				noShow: attendanceOf(s.id, 'no_show')
			}))
	};
}

/** Instance-wide numbers for admins: accounts and goodie pickups. */
export async function adminNumbers(db: Tx, editionId: string, now: Date) {
	const [[accounts], [verified], [recent], claims] = await Promise.all([
		db.select({ n: count() }).from(users),
		db.select({ n: count() }).from(users).where(isNotNull(users.emailVerifiedAt)),
		db
			.select({ n: count() })
			.from(users)
			.where(gte(users.createdAt, new Date(now.getTime() - 7 * 24 * HOUR))),
		db
			.select({ status: goodieClaims.status, n: count() })
			.from(goodieClaims)
			.where(eq(goodieClaims.editionId, editionId))
			.groupBy(goodieClaims.status)
	]);
	const claimsOf = (status: string) => claims.find((c) => c.status === status)?.n ?? 0;
	return {
		accounts: accounts.n,
		verified: verified.n,
		newThisWeek: recent.n,
		goodiesSelected: claimsOf('selected'),
		goodiesIssued: claimsOf('issued')
	};
}
