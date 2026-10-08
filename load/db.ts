/**
 * Database side of the load test (see load/README.md). Talks to the database directly, not to the
 * app, so preparing data does not show up in the measurements.
 *
 *   npx tsx load/db.ts seed            fresh instance with helpers, areas, shifts and sessions
 *   npx tsx load/db.ts wave <seconds>  remove all bookings, open the booking wave in <seconds>
 *   npx tsx load/db.ts check           consistency after a run (overbooking, double bookings)
 *   npx tsx load/db.ts stats [reset]   slowest queries (needs pg_stat_statements)
 *
 * DATABASE_URL points to the database, BASE_URL is the address k6 will use for the app.
 * Seed size: HELPERS (default 3000), SHIFTS (default 1500), LEADS (default 20).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { connect, type DB } from '#lib/server/db/client.ts';
import {
	bookingWaves,
	roleAssignments,
	roles,
	sessions,
	shiftPositions,
	shifts,
	users
} from '#lib/server/db/schema.ts';
import { hashPassword, randomToken, sha256 } from '#lib/server/crypto.ts';
import { completeSetup, prepareSetup } from '#lib/server/services/setup.ts';
import { createArea } from '#lib/server/services/areas.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { SESSION_LIFETIME } from '#lib/server/sessions.ts';

const OUT = 'load/out';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const env = (name: string, fallback: number) => Number(process.env[name] ?? fallback);
const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
const chunks = <T>(list: T[], size: number) =>
	Array.from({ length: Math.ceil(list.length / size) }, (_, i) =>
		list.slice(i * size, (i + 1) * size)
	);

const AREAS: Record<string, string[]> = {
	Bar: ['Theke Hauptbühne', 'Theke Zelt', 'Cocktails', 'Pfand'],
	Einlass: ['Bändchen', 'Kasse', 'Taschenkontrolle'],
	'Auf- und Abbau': ['Bühne', 'Zäune', 'Strom'],
	Awareness: ['Team Tag', 'Team Nacht'],
	Küche: ['Crew-Catering', 'Spülen'],
	Infostand: ['Info', 'Fundbüro'],
	Parken: ['Einweisen', 'Shuttle'],
	Sanitär: ['Rundgang', 'Kontrolle']
};

async function seed(db: DB) {
	const helperCount = env('HELPERS', 3000);
	const shiftCount = env('SHIFTS', 1500);
	const leadCount = env('LEADS', 20);
	const baseUrl = process.env.BASE_URL ?? 'http://localhost:3006';

	const [existing] = await db.select({ id: users.id }).from(users).limit(1);
	if (existing) throw new Error('The database is not empty. Seed a fresh database.');

	const password = randomBytes(12).toString('base64url');
	const setupToken = randomToken();
	await prepareSetup(db, setupToken);
	const start = new Date(Date.now() + 14 * DAY);
	start.setUTCHours(0, 0, 0, 0);
	const days = 5;
	const day = (i: number) => new Date(start.getTime() + i * DAY).toISOString().slice(0, 10);
	const admin = await completeSetup(db, {
		token: setupToken,
		festivalName: 'Lastfest',
		firstName: 'Ada',
		lastName: 'Admin',
		email: 'admin@load.test',
		phone: '',
		password,
		locale: 'de',
		editionName: 'Lastfest',
		startsOn: day(0),
		endsOn: day(days - 1)
	});
	const edition = (await getCurrentEdition(db))!;
	const actor = { userId: admin.id };

	const subAreas: string[] = [];
	const topAreas: string[] = [];
	let order = 0;
	for (const [name, children] of Object.entries(AREAS)) {
		const area = await createArea(db, actor, edition.id, areaInput(name, null, order++));
		topAreas.push(area.id);
		for (const child of children)
			subAreas.push(
				(await createArea(db, actor, edition.id, areaInput(child, area.id, order++))).id
			);
	}

	// Shifts spread over the festival days; one to three positions each.
	const positionsOut: { id: string; shift: string; s: number; e: number; w: number }[] = [];
	for (const batch of chunks(Array.from({ length: shiftCount }), 200)) {
		const shiftRows = batch.map(() => {
			const hours = pick([2, 3, 4, 4, 4, 6]);
			const startsAt = new Date(
				start.getTime() +
					Math.floor(Math.random() * days) * DAY +
					pick([6, 8, 10, 12, 14, 16, 18, 20, 22]) * HOUR
			);
			return {
				editionId: edition.id,
				areaId: pick(subAreas),
				titleDe: pick(['Frühschicht', 'Tagschicht', 'Spätschicht', 'Nachtschicht', 'Springer']),
				titleEn: 'Shift',
				descriptionDe: 'Bitte zehn Minuten vorher am Treffpunkt sein.',
				location: 'Gelände',
				meetingPoint: 'Helfendenzelt',
				startsAt,
				endsAt: new Date(startsAt.getTime() + hours * HOUR)
			};
		});
		const inserted = await db.insert(shifts).values(shiftRows).returning();
		const positionRows = inserted.flatMap((s) =>
			Array.from({ length: pick([1, 1, 1, 2, 2]) }, (_, i) => ({
				shiftId: s.id,
				nameDe: pick(['Team', 'Leitung vor Ort', 'Springer', 'Kasse', 'Aufbau']),
				nameEn: 'Team',
				capacity: pick([1, 1, 2, 2, 2, 3, 3, 4, 5, 6]),
				bookingMode: Math.random() < 0.1 ? ('request' as const) : ('open' as const),
				sortOrder: i
			}))
		);
		const positions = await db.insert(shiftPositions).values(positionRows).returning();
		const byShift = new Map(inserted.map((s) => [s.id, s]));
		for (const p of positions) {
			const s = byShift.get(p.shiftId)!;
			// Popularity: a few positions are wanted by many (evening bar), most by few.
			const w = Math.min(50, 1 / Math.pow(Math.random(), 0.8));
			positionsOut.push({
				id: p.id,
				shift: s.id,
				s: s.startsAt.getTime(),
				e: s.endsAt.getTime(),
				w: Math.round(w * 100) / 100
			});
		}
	}

	// One password hash for everybody: hashing thousands of passwords would take minutes.
	const passwordHash = await hashPassword(password);
	const now = new Date();
	const userRows = Array.from({ length: helperCount + leadCount }, (_, i) => ({
		email: i < leadCount ? `lead${i}@load.test` : `helper${i - leadCount}@load.test`,
		passwordHash,
		firstName: pick([
			'Alex',
			'Kim',
			'Sam',
			'Jo',
			'Mika',
			'Robin',
			'Charlie',
			'Noa',
			'Luca',
			'Toni'
		]),
		lastName: pick(['Berger', 'Yilmaz', 'Schmidt', 'Nowak', 'Weber', 'Fischer', 'Kaya', 'Wagner']),
		phone: '+49 151 0000000',
		emailVerifiedAt: now,
		lastSeenAt: now
	}));
	const people: { id: string; email: string; calendarToken: string }[] = [];
	for (const batch of chunks(userRows, 1000))
		people.push(
			...(await db
				.insert(users)
				.values(batch)
				.returning({ id: users.id, email: users.email, calendarToken: users.calendarToken }))
		);

	// Area leads for the top areas, so lead pages are part of the mix.
	const [areaLead] = await db.select().from(roles).where(eq(roles.nameDe, 'Bereichsleitung'));
	const leads = people.slice(0, leadCount);
	if (leads.length)
		await db.insert(roleAssignments).values(
			leads.map((l, i) => ({
				userId: l.id,
				roleId: areaLead.id,
				editionId: edition.id,
				areaId: topAreas[i % topAreas.length],
				createdBy: admin.id
			}))
		);

	// Sessions are created directly: logging in is measured on its own (scenario login).
	const tokens = new Map<string, string>();
	const expiresAt = new Date(Date.now() + SESSION_LIFETIME);
	for (const batch of chunks([admin, ...people], 1000)) {
		const rows = batch.map((u) => {
			const token = randomToken();
			tokens.set(u.id, token);
			return { id: sha256(token), userId: u.id, expiresAt };
		});
		await db.insert(sessions).values(rows);
	}

	await db.insert(bookingWaves).values({
		editionId: edition.id,
		name: 'Hauptwelle',
		opensAt: new Date(Date.now() + 365 * DAY),
		audience: 'everyone'
	});

	mkdirSync(OUT, { recursive: true });
	const fixture = {
		baseUrl,
		password,
		admin: { email: admin.email, session: tokens.get(admin.id) },
		leads: leads.map((l) => ({ email: l.email, session: tokens.get(l.id) })),
		helpers: people.slice(leadCount).map((h) => ({
			email: h.email,
			session: tokens.get(h.id),
			calendar: h.calendarToken
		})),
		positions: positionsOut
	};
	writeFileSync(`${OUT}/fixture.json`, JSON.stringify(fixture));
	const [{ places }] = await db
		.select({ places: sql<number>`sum(capacity)::int` })
		.from(shiftPositions);
	console.log(
		`Seeded ${helperCount} helpers, ${leadCount} leads, ${shiftCount} shifts with ` +
			`${positionsOut.length} positions and ${places} places. Fixture: ${OUT}/fixture.json`
	);
}

function areaInput(name: string, parentId: string | null, sortOrder: number) {
	return {
		parentId,
		nameDe: name,
		nameEn: name,
		descriptionDe: '',
		descriptionEn: '',
		sortOrder,
		cancelDeadlineHours: null,
		pointsPerShift: null,
		pointsPerHour: null
	};
}

/** Clears bookings and mails and lets the wave open in `seconds`. */
async function wave(db: DB, seconds: number) {
	const edition = await getCurrentEdition(db);
	if (!edition) throw new Error('No current edition. Run seed first.');
	const opensAt = new Date(Date.now() + seconds * 1000);
	await db.transaction(async (tx) => {
		await tx.execute(
			sql`delete from assignments where shift_id in (select id from shifts where edition_id = ${edition.id})`
		);
		await tx.execute(sql`delete from email_outbox`);
		await tx.update(bookingWaves).set({ opensAt }).where(eq(bookingWaves.editionId, edition.id));
	});
	console.log(`WAVE_AT=${opensAt.getTime()}`);
	console.log(`Wave opens at ${opensAt.toISOString()} (in ${seconds} s).`);
}

/** Invariants that must hold however many people booked at once. */
async function check(db: DB) {
	const queries: [string, ReturnType<typeof sql>][] = [
		[
			'overbooked positions',
			sql`select p.id, p.capacity, count(a.id)::int as taken from shift_positions p
				join assignments a on a.position_id = p.id and a.status in ('booked', 'held')
				group by p.id having count(a.id) > p.capacity`
		],
		[
			'people with two active bookings in one shift',
			sql`select user_id, shift_id, count(*)::int from assignments
				where status in ('requested', 'booked', 'held', 'waitlisted')
				group by user_id, shift_id having count(*) > 1`
		],
		[
			'overlapping bookings of one person',
			sql`select a1.user_id, a1.id as first, a2.id as second from assignments a1
				join shifts s1 on s1.id = a1.shift_id
				join assignments a2 on a2.user_id = a1.user_id and a2.id > a1.id
				join shifts s2 on s2.id = a2.shift_id
				where a1.status in ('requested', 'booked', 'held') and a2.status in ('requested', 'booked', 'held')
					and s1.id <> s2.id and s1.starts_at < s2.ends_at and s2.starts_at < s1.ends_at`
		]
	];
	let ok = true;
	for (const [label, query] of queries) {
		const list = rowsOf(await db.execute(query));
		console.log(`${list.length === 0 ? 'ok  ' : 'FAIL'} ${label}: ${list.length}`);
		if (list.length) {
			ok = false;
			console.log(list.slice(0, 5));
		}
	}
	const summary = await db.execute(
		sql`select status, count(*)::int from assignments group by status order by status`
	);
	console.table(rowsOf(summary));
	process.exitCode = ok ? 0 : 1;
}

async function stats(db: DB, reset: boolean) {
	await db.execute(sql`create extension if not exists pg_stat_statements`);
	if (reset) {
		await db.execute(sql`select pg_stat_statements_reset()`);
		console.log('Statistics reset.');
		return;
	}
	const rows = await db.execute(sql`
		select calls, round(total_exec_time)::int as total_ms, round(mean_exec_time::numeric, 2) as mean_ms,
			round(max_exec_time::numeric, 1) as max_ms, rows, left(regexp_replace(query, '\\s+', ' ', 'g'), 160) as query
		from pg_stat_statements order by total_exec_time desc limit 25`);
	console.table(rowsOf(rows));
}

/** postgres-js returns the rows, PGlite an object with `rows`. */
function rowsOf(result: unknown): unknown[] {
	return Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
}

const [command, arg] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set.');
const database = await connect(url);
try {
	if (command === 'seed') {
		await database.migrate();
		await seed(database.db);
	} else if (command === 'wave') await wave(database.db, Number(arg ?? 60));
	else if (command === 'check') await check(database.db);
	else if (command === 'stats') await stats(database.db, arg === 'reset');
	else console.log('Commands: seed | wave <seconds> | check | stats [reset]');
} finally {
	await database.close();
}
