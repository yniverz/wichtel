/**
 * Demo data for the help-site screenshots (see README.md in this folder): a small, believable
 * festival with areas, shifts, bookings, points, goodies, news and three personas. Built through
 * the app's own services wherever possible, so the same rules apply as in real use.
 *
 *   DATABASE_URL=pglite://<dir> npx tsx scripts/screenshots/seed.ts <out-dir>
 *
 * Writes `<out-dir>/personas.json` with session tokens and the ids the capture script needs.
 * All dates are relative to today, so the screenshots never look stale.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { and, eq, inArray } from 'drizzle-orm';
import { connect, type DB } from '#lib/server/db/client.ts';
import {
	assignments,
	bookingWaves,
	buddyGroups,
	emailOutbox,
	goodieClaims,
	news,
	roles,
	shiftPositions,
	shifts,
	users,
	type Shift,
	type ShiftPosition
} from '#lib/server/db/schema.ts';
import { hashPassword } from '#lib/server/crypto.ts';
import { DomainError } from '#lib/server/errors.ts';
import { createSession } from '#lib/server/sessions.ts';
import type { Actor } from '#lib/server/audit.ts';
import { addDays, shiftInterval, utcToZoned, type IsoDate } from '#lib/domain/time.ts';
import { inviteCodeFrom } from '#lib/domain/collaboration.ts';
import { completeSetup, prepareSetup } from '#lib/server/services/setup.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { updateSettings } from '#lib/server/services/settings.ts';
import { createArea, type AreaInput } from '#lib/server/services/areas.ts';
import { createPlace, setDeskPlace, type PlaceInput } from '#lib/server/services/places.ts';
import {
	createQualification,
	applyForQualification,
	grantQualification
} from '#lib/server/services/qualifications.ts';
import {
	createSeries,
	createShift,
	type PositionInput,
	type ShiftDetailsInput
} from '#lib/server/services/shifts.ts';
import { createGoodie, claimGoodie, issueClaim } from '#lib/server/services/goodies.ts';
import { createWave } from '#lib/server/services/waves.ts';
import { assignRole, loadAuthz } from '#lib/server/services/roles.ts';
import {
	bookPosition,
	decideRequest,
	joinWaitlist,
	setAttendance,
	type BookingOptions
} from '#lib/server/services/assignments.ts';
import { callUrgent } from '#lib/server/services/urgent.ts';
import { publishNews, type NewsInput } from '#lib/server/services/news.ts';
import { createGroup, joinGroup } from '#lib/server/services/groups.ts';
import { register } from '#lib/server/services/accounts.ts';
import { storeImage } from '#lib/server/services/assets.ts';

const TZ = 'Europe/Berlin';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** The three people the screenshots are taken as. Passwords only matter for trying things out. */
export const PERSONAS = {
	admin: {
		email: 'admin@lindenfest.example',
		password: 'lindenfest-admin',
		firstName: 'Kai',
		lastName: 'Lindner'
	},
	lead: {
		email: 'mo.schuster@lindenfest.example',
		password: 'lindenfest-lead',
		firstName: 'Mo',
		lastName: 'Schuster'
	},
	helper: {
		email: 'lena.vogt@example.org',
		password: 'lindenfest-helper',
		firstName: 'Lena',
		lastName: 'Vogt'
	}
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Small deterministic PRNG, so every run produces the same festival. */
function prng(seed: number) {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const random = prng(2027);
const shuffle = <T>(list: readonly T[]) => {
	const copy = [...list];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
};
const hex = (length: number) =>
	Array.from({ length }, () => Math.floor(random() * 16).toString(16)).join('');

const today: IsoDate = utcToZoned(new Date(), TZ).date;
const day = (offset: number) => addDays(today, offset);
const at = (offset: number, start: string, end: string) =>
	shiftInterval(day(offset), start, end, TZ);
/** A full hour relative to now, for "when did this happen" fields (no odd minutes on screen). */
const ago = (days: number, hours = 0) =>
	new Date(Math.floor((Date.now() - days * DAY - hours * HOUR) / HOUR) * HOUR);

/** A simple linden leaf as the festival logo. */
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<circle cx="32" cy="32" r="31" fill="#2f6b3a"/>
<path d="M32 50c-9-4-15-11-15-20 0-7 5-12 11-12 2 0 3 1 4 2 1-1 2-2 4-2 6 0 11 5 11 12 0 9-6 16-15 20z" fill="#f4c430"/>
<path d="M32 22v34" stroke="#2f6b3a" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

const ascii = (s: string) =>
	s
		.toLowerCase()
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ü/g, 'ue')
		.replace(/ß/g, 'ss')
		.replace(/ı/g, 'i')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '');

const FIRST = [
	'Anna', 'Ben', 'Clara', 'David', 'Elif', 'Felix', 'Greta', 'Hannes', 'Ida', 'Jonas',
	'Kira', 'Lukas', 'Mara', 'Niklas', 'Olivia', 'Paul', 'Rana', 'Simon', 'Tara', 'Uwe',
	'Vera', 'Yusuf', 'Zoe', 'Aylin', 'Bastian', 'Carla', 'Deniz', 'Emil', 'Frieda', 'Gustav',
	'Hanna', 'Ilias', 'Jule', 'Karl', 'Lotta', 'Malte', 'Nele', 'Oskar', 'Pia', 'Ruben'
]; // prettier-ignore
const LAST = [
	'Albers', 'Brandt', 'Conrad', 'Dietz', 'Engel', 'Falk', 'Gerber', 'Haas', 'Imhoff', 'Jansen',
	'Kühn', 'Lorenz', 'Möller', 'Nolte', 'Ostrowski', 'Peters', 'Quandt', 'Ritter', 'Sommer', 'Thiel',
	'Ulrich', 'Voss', 'Winter', 'Yıldız', 'Zander', 'Arslan', 'Bauer', 'Christensen', 'Demir', 'Eberhardt',
	'Fuchs', 'Graf', 'Hoffmann', 'Iwanowa', 'Jäger', 'Krause', 'Lange', 'Marx', 'Novak', 'Otto'
]; // prettier-ignore

function area(
	nameDe: string,
	nameEn: string,
	parentId: string | null,
	sortOrder: number,
	extra: Partial<AreaInput> = {}
): AreaInput {
	return {
		parentId,
		nameDe,
		nameEn,
		descriptionDe: '',
		descriptionEn: '',
		sortOrder,
		cancelDeadlineHours: null,
		pointsPerShift: null,
		pointsPerHour: null,
		...extra
	};
}

function place(
	nameDe: string,
	nameEn: string,
	sortOrder: number,
	descriptionDe = '',
	descriptionEn = ''
): PlaceInput {
	return {
		nameDe,
		nameEn,
		descriptionDe,
		descriptionEn,
		address: '',
		lat: null,
		lng: null,
		planX: null,
		planY: null,
		sortOrder
	};
}

function position(
	nameDe: string,
	nameEn: string,
	capacity: number,
	extra: Partial<PositionInput> = {}
): PositionInput {
	return {
		nameDe,
		nameEn,
		descriptionDe: '',
		descriptionEn: '',
		capacity,
		bookingMode: 'open',
		...extra
	};
}

/** Expected refusals while filling shifts at random (overlap, qualification, full …). */
async function tryIt<T>(fn: () => Promise<T>): Promise<T | null> {
	try {
		return await fn();
	} catch (e) {
		if (e instanceof DomainError) return null;
		throw e;
	}
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed(db: DB, outDir: string) {
	const [existing] = await db.select({ id: users.id }).from(users).limit(1);
	if (existing) throw new Error('The database is not empty. Seed a fresh database.');

	// Instance and edition ----------------------------------------------------
	const setupToken = 'screenshot-setup-token-0123456789';
	await prepareSetup(db, setupToken);
	const year = day(3).slice(0, 4);
	const admin = await completeSetup(db, {
		token: setupToken,
		festivalName: 'Lindenfest',
		...PERSONAS.admin,
		phone: '+49 151 23456780',
		locale: 'de',
		editionName: `Lindenfest ${year}`,
		startsOn: day(-2),
		endsOn: day(5)
	});
	const edition = (await getCurrentEdition(db))!;
	const logo = await storeImage(
		db,
		path.join(outDir, 'uploads'),
		new File([LOGO], 'lindenfest.svg', { type: 'image/svg+xml' }),
		admin.id
	);
	const editionId = edition.id;
	const actor: Actor = { userId: admin.id };
	const adminAuthz = await loadAuthz(db, admin, editionId);

	await updateSettings(db, actor, {
		taglineDe: 'Drei Tage Musik, Theater und gutes Essen auf der Lindenwiese.',
		taglineEn: 'Three days of music, theatre and good food on the Lindenwiese.',
		contactEmail: 'helfen@lindenfest.example',
		legalName: 'Lindenfest e. V.',
		legalAddress: 'Wiesenweg 12\n12345 Beispielstadt',
		legalEmail: 'vorstand@lindenfest.example',
		legalRepresentative: 'Kai Lindner (Vorstand)',
		privacyDe: 'Wir speichern nur, was für die Schichtplanung nötig ist.',
		privacyEn: 'We only store what is needed to plan shifts.',
		cancelDeadlineHours: 48,
		pointsPerShift: 0,
		pointsPerHour: 1,
		nightBonus: 2,
		nightStart: '00:00',
		nightEnd: '06:00',
		reminderHours: 24,
		logoAssetId: logo
	});

	// Places ------------------------------------------------------------------
	const tent = await createPlace(
		db,
		actor,
		editionId,
		place(
			'Helfendenzelt',
			'Volunteer tent',
			0,
			'Weißes Zelt hinter der Hauptbühne, Eingang über den Crew-Parkplatz.',
			'White tent behind the main stage, entrance via the crew car park.'
		)
	);
	const stage = await createPlace(db, actor, editionId, place('Hauptbühne', 'Main stage', 1));
	const barTent = await createPlace(
		db,
		actor,
		editionId,
		place('Barzelt', 'Bar tent', 2, 'Neben dem Biergarten.', 'Next to the beer garden.')
	);
	const gate = await createPlace(
		db,
		actor,
		editionId,
		place('Einlass Nord', 'North gate', 3, 'Am Ende der Lindenallee.', 'At the end of Lindenallee.')
	);
	const careTent = await createPlace(
		db,
		actor,
		editionId,
		place('Awareness-Zelt', 'Awareness tent', 4)
	);
	const info = await createPlace(db, actor, editionId, place('Infostand', 'Info booth', 5));
	await setDeskPlace(db, actor, editionId, tent.id);

	// Areas -------------------------------------------------------------------
	let order = 0;
	const mk = async (input: AreaInput) => (await createArea(db, actor, editionId, input)).id;
	const bar = await mk(
		area('Bar', 'Bar', null, order++, {
			descriptionDe: 'Getränke, Bons und Pfand im Barzelt.',
			descriptionEn: 'Drinks, tokens and deposit in the bar tent.'
		})
	);
	const counter = await mk(area('Theke', 'Bar counter', bar, order++));
	const till = await mk(area('Bonkasse', 'Token till', bar, order++));
	const deposit = await mk(area('Pfand', 'Deposit return', bar, order++));
	const entrance = await mk(area('Einlass', 'Entrance', null, order++));
	const wristbands = await mk(area('Bändchenausgabe', 'Wristbands', entrance, order++));
	const tickets = await mk(area('Ticketkontrolle', 'Ticket check', entrance, order++));
	const build = await mk(
		area('Auf- und Abbau', 'Setup and teardown', null, order++, {
			cancelDeadlineHours: 72,
			// Heavy work counts double.
			pointsPerHour: 2
		})
	);
	const awareness = await mk(
		area('Awareness', 'Awareness', null, order++, {
			descriptionDe: 'Ansprechbar sein für alle, die sich unwohl fühlen.',
			descriptionEn: 'Being there for anyone who feels uncomfortable.'
		})
	);
	const infoArea = await mk(area('Infostand', 'Info booth', null, order));

	// Qualifications ------------------------------------------------------------
	const youth = await createQualification(db, actor, {
		nameDe: 'Jugendschutz-Einweisung',
		nameEn: 'Youth protection briefing',
		descriptionDe: 'Kurze Einweisung, wer was ausgeschenkt bekommen darf.',
		descriptionEn: 'Short briefing on who may be served what.',
		proof: 'confirm',
		documentRetention: 'delete_after_review',
		validityDays: 365,
		active: true,
		sortOrder: 0
	});
	const forklift = await createQualification(db, actor, {
		nameDe: 'Staplerschein',
		nameEn: 'Forklift licence',
		descriptionDe: 'Nachweis als Foto oder PDF.',
		descriptionEn: 'Proof as a photo or PDF.',
		proof: 'upload',
		documentRetention: 'delete_after_review',
		validityDays: null,
		active: true,
		sortOrder: 1
	});
	await createQualification(db, actor, {
		nameDe: 'Erste Hilfe',
		nameEn: 'First aid',
		descriptionDe: 'Kurs nicht älter als zwei Jahre.',
		descriptionEn: 'Course not older than two years.',
		proof: 'either',
		documentRetention: 'delete_after_review',
		validityDays: 730,
		active: true,
		sortOrder: 2
	});

	// Shifts ------------------------------------------------------------------
	const details = (
		areaId: string,
		titleDe: string,
		titleEn: string,
		extra: Partial<ShiftDetailsInput> = {}
	): ShiftDetailsInput => ({
		areaId,
		titleDe,
		titleEn,
		descriptionDe: '',
		descriptionEn: '',
		location: '',
		meetingPoint: '',
		contact: '',
		visibility: 'public',
		cancelDeadlineHours: null,
		locationPlaceId: null,
		meetingPlaceId: tent.id,
		...extra
	});
	const shift = (
		info: ShiftDetailsInput,
		when: { startsAt: Date; endsAt: Date },
		positions: PositionInput[]
	) => createShift(db, actor, editionId, { ...info, ...when, positions });

	const barBriefing = {
		descriptionDe:
			'Getränke ausschenken, Bons annehmen, Theke sauber halten. Die Schichtleitung zeigt dir vor Ort alles Wichtige.',
		descriptionEn:
			'Serve drinks, take tokens, keep the counter clean. The shift lead shows you everything on site.',
		locationPlaceId: barTent.id,
		meetingPlaceId: barTent.id,
		contact: 'Mo Schuster, +49 151 98765432'
	};

	// Setup days (in the past and today): these get attendance and points.
	const fence = await shift(
		details(build, 'Zaunbau', 'Fence building', {
			descriptionDe: 'Bauzäune stellen und Sichtschutz anbringen. Handschuhe gibt es vor Ort.',
			descriptionEn: 'Put up fences and screens. Gloves are provided.',
			locationPlaceId: gate.id
		}),
		at(-2, '08:00', '14:00'),
		[position('Team', 'Team', 6)]
	);
	const stageBuild = await shift(
		details(build, 'Bühnenaufbau', 'Stage setup', { locationPlaceId: stage.id }),
		at(-1, '08:00', '14:00'),
		[
			position('Team', 'Team', 6),
			position('Staplerfahrer:in', 'Forklift driver', 1, {
				requiredQualificationIds: [forklift.id]
			})
		]
	);
	const tents = await shift(
		details(build, 'Zelte und Deko', 'Tents and decoration'),
		at(-1, '14:00', '20:00'),
		[position('Team', 'Team', 5)]
	);
	const barSetup = await shift(
		details(build, 'Barzelt einrichten', 'Bar tent setup', { locationPlaceId: barTent.id }),
		at(0, '08:00', '14:00'),
		[position('Team', 'Team', 4)]
	);
	const power = await shift(
		details(build, 'Licht und Strom', 'Lights and power', { locationPlaceId: stage.id }),
		at(0, '14:00', '20:00'),
		[position('Team', 'Team', 3)]
	);
	const teardown = await shift(
		details(build, 'Abbau', 'Teardown', {
			descriptionDe: 'Alles, was wir aufgebaut haben, kommt wieder weg. Mit Frühstück!',
			descriptionEn: 'Everything we put up comes down again. Breakfast included!'
		}),
		at(5, '09:00', '15:00'),
		[
			position('Team', 'Team', 10),
			position('Staplerfahrer:in', 'Forklift driver', 1, {
				requiredQualificationIds: [forklift.id]
			})
		]
	);
	await shift(
		details(build, 'Abbau Bar', 'Bar teardown', { locationPlaceId: barTent.id }),
		at(5, '15:00', '19:00'),
		[position('Team', 'Team', 4)]
	);

	// Festival days 2–4: the bar counter as a series (three slots a day).
	const festival = { from: day(2), to: day(4), weekdays: [0, 1, 2, 3, 4, 5, 6], timeZone: TZ };
	await createSeries(
		db,
		actor,
		editionId,
		details(counter, 'Theke', 'Bar counter', barBriefing),
		[
			position('Theke', 'Counter', 4),
			position('Schichtleitung', 'Shift lead', 1, {
				bookingMode: 'request',
				descriptionDe: 'Hat den Überblick, verwaltet die Kasse und ist Ansprechperson.',
				descriptionEn: 'Keeps the overview, handles the cash and is the contact person.'
			})
		],
		{
			...festival,
			slots: [
				{ start: '16:00', end: '20:00' },
				{ start: '20:00', end: '00:00' }
			]
		}
	);
	// The late slot belongs to the night after each festival day.
	await createSeries(
		db,
		actor,
		editionId,
		details(counter, 'Theke', 'Bar counter', barBriefing),
		[position('Theke', 'Counter', 3)],
		{ ...festival, from: day(3), to: day(5), slots: [{ start: '00:00', end: '03:00' }] }
	);
	await createSeries(
		db,
		actor,
		editionId,
		details(till, 'Bonkasse', 'Token till', {
			...barBriefing,
			descriptionDe: 'Bons verkaufen und Wechselgeld herausgeben. Bitte Jugendschutz beachten.',
			descriptionEn: 'Sell tokens and give change. Please mind youth protection.'
		}),
		[position('Kasse', 'Till', 2, { requiredQualificationIds: [youth.id] })],
		{
			...festival,
			slots: [
				{ start: '17:00', end: '21:00' },
				{ start: '21:00', end: '01:00' }
			]
		}
	);
	const depositShift = await shift(
		details(deposit, 'Pfandrücknahme', 'Deposit return', { locationPlaceId: barTent.id }),
		at(3, '18:00', '23:00'),
		[position('Pfand', 'Deposit', 3)]
	);
	const wristbandInfo = {
		locationPlaceId: gate.id,
		descriptionDe:
			'Tickets scannen, Bändchen anlegen, Fragen beantworten. Ideal für die erste Schicht – du bist nie allein.',
		descriptionEn:
			'Scan tickets, put on wristbands, answer questions. Ideal as a first shift – you are never alone.'
	};
	await shift(
		details(wristbands, 'Bändchenausgabe', 'Wristbands', wristbandInfo),
		at(2, '14:00', '18:00'),
		[position('Ausgabe', 'Handing out', 4), position('Springer:in', 'Floater', 1)]
	);
	const wristbandSat = await shift(
		details(wristbands, 'Bändchenausgabe', 'Wristbands', wristbandInfo),
		at(3, '12:00', '16:00'),
		[position('Ausgabe', 'Handing out', 4), position('Springer:in', 'Floater', 1)]
	);
	await shift(
		details(tickets, 'Ticketkontrolle', 'Ticket check', { locationPlaceId: gate.id }),
		at(2, '18:00', '22:00'),
		[position('Kontrolle', 'Checking', 3)]
	);
	const urgentShift = await shift(
		details(tickets, 'Ticketkontrolle', 'Ticket check', { locationPlaceId: gate.id }),
		at(3, '16:00', '20:00'),
		[position('Kontrolle', 'Checking', 3)]
	);
	const awarenessBriefing = await shift(
		details(awareness, 'Awareness-Schulung', 'Awareness training', {
			descriptionDe: 'Pflicht für alle im Awareness-Team. Getränke und Snacks gibt es.',
			descriptionEn: 'Required for everyone on the awareness team. Drinks and snacks provided.',
			locationPlaceId: careTent.id,
			meetingPlaceId: careTent.id
		}),
		at(1, '18:00', '20:00'),
		[position('Teilnahme', 'Participant', 12)]
	);
	for (const offset of [2, 3]) {
		await shift(
			details(awareness, 'Awareness-Team Nacht', 'Awareness team night', {
				descriptionDe: 'Zu zweit über das Gelände, Ansprechbar im Awareness-Zelt.',
				descriptionEn: 'Walking the grounds in pairs, available in the awareness tent.',
				locationPlaceId: careTent.id,
				meetingPlaceId: careTent.id
			}),
			at(offset, '20:00', '02:00'),
			[
				position('Awareness', 'Awareness', 3, {
					bookingMode: 'request',
					descriptionDe: 'Wir melden uns vorher kurz bei dir.',
					descriptionEn: 'We will get in touch with you beforehand.'
				})
			]
		);
	}
	for (const offset of [2, 3, 4]) {
		await shift(
			details(infoArea, 'Infostand', 'Info booth', { locationPlaceId: info.id }),
			at(offset, '12:00', '16:00'),
			[position('Info', 'Info', 2)]
		);
	}

	const allShifts = await db.select().from(shifts).where(eq(shifts.editionId, editionId));
	const allPositions = await db
		.select()
		.from(shiftPositions)
		.where(
			inArray(
				shiftPositions.shiftId,
				allShifts.map((s) => s.id)
			)
		);
	const shiftById = new Map(allShifts.map((s) => [s.id, s]));
	const positionsOf = (s: Shift) => allPositions.filter((p) => p.shiftId === s.id);
	const find = (titleDe: string, offset: number, start: string) =>
		allShifts.find(
			(s) =>
				s.titleDe === titleDe &&
				utcToZoned(s.startsAt, TZ).date === day(offset) &&
				utcToZoned(s.startsAt, TZ).time === start
		)!;
	const pos = (s: Shift, nameDe?: string) =>
		positionsOf(s).find((p) => !nameDe || p.nameDe === nameDe)!;

	// People ------------------------------------------------------------------
	const lead = await register(
		{ db, baseUrl: 'http://localhost', skipEmailVerification: true },
		{ ...PERSONAS.lead, phone: '+49 151 98765432', locale: 'de' }
	);
	const helper = await register(
		{ db, baseUrl: 'http://localhost', skipEmailVerification: true },
		{ ...PERSONAS.helper, phone: '+49 160 5550123', locale: 'de' }
	);
	// One hash for the crowd: hashing forty passwords would only cost time.
	const crowdHash = await hashPassword('lindenfest-helper');
	const crowd = await db
		.insert(users)
		.values(
			FIRST.map((first, i) => {
				const last = LAST[(i * 7) % LAST.length];
				return {
					email: `${ascii(first)}.${ascii(last)}@example.org`,
					passwordHash: crowdHash,
					firstName: first,
					lastName: last,
					phone: `+49 15${i % 10} ${String(1000000 + i * 7919).slice(0, 7)}`,
					locale: i % 6 === 5 ? ('en' as const) : ('de' as const),
					emailVerifiedAt: ago(30 - (i % 20)),
					lastSeenAt: ago(i % 5),
					createdAt: ago(40 - (i % 25))
				};
			})
		)
		.returning();
	await db
		.update(users)
		.set({ qrToken: hex(32), calendarToken: hex(32) })
		.where(eq(users.id, helper.id));

	// Roles: the lead runs the bar; two crowd members staff the volunteer desk.
	const [areaLeadRole] = await db.select().from(roles).where(eq(roles.nameDe, 'Bereichsleitung'));
	const [deskRole] = await db.select().from(roles).where(eq(roles.nameDe, 'Helferanmeldung'));
	const [shiftLeadRole] = await db.select().from(roles).where(eq(roles.nameDe, 'Schichtleitung'));
	await assignRole(db, actor, adminAuthz, {
		userId: lead.id,
		roleId: areaLeadRole.id,
		editionId,
		areaId: bar
	});
	await assignRole(db, actor, adminAuthz, {
		userId: crowd[3].id,
		roleId: areaLeadRole.id,
		editionId,
		areaId: entrance
	});
	await assignRole(db, actor, adminAuthz, {
		userId: crowd[8].id,
		roleId: deskRole.id,
		editionId,
		areaId: null
	});
	await assignRole(db, actor, adminAuthz, {
		userId: crowd[12].id,
		roleId: shiftLeadRole.id,
		editionId,
		areaId: build
	});

	// Qualifications held and requested.
	for (const person of [helper, lead, ...crowd.slice(0, 16)])
		await grantQualification(db, actor, {
			userId: person.id,
			qualificationId: youth.id,
			now: ago(20)
		});
	for (const person of [crowd[5], crowd[21]])
		await grantQualification(db, actor, {
			userId: person.id,
			qualificationId: forklift.id,
			now: ago(25)
		});
	for (const [i, person] of [crowd[30], crowd[34]].entries())
		await applyForQualification(db, path.join(outDir, 'uploads'), person.id, {
			qualificationId: youth.id,
			confirmed: true,
			document: null,
			note: i === 0 ? 'Habe ich letztes Jahr beim Stadtfest gemacht.' : ''
		});

	// Goodies -----------------------------------------------------------------
	const goodie = (
		nameDe: string,
		nameEn: string,
		descriptionDe: string,
		descriptionEn: string,
		price: number,
		sortOrder: number,
		extra: Partial<Parameters<typeof createGoodie>[3]> = {}
	) =>
		createGoodie(db, actor, editionId, {
			nameDe,
			nameEn,
			descriptionDe,
			descriptionEn,
			price,
			maxPerPerson: 1,
			selfServiceLimit: null,
			stock: null,
			variants: [],
			requiredAreaIds: [],
			mandatory: false,
			mandatoryPriority: 0,
			refundable: false,
			advance: false,
			active: true,
			sortOrder,
			pickupPlaceId: null,
			pickupInfo: '',
			...extra
		});
	await goodie(
		'Festivalticket',
		'Festival ticket',
		'Dein Ticket für alle drei Tage. Wird automatisch eingelöst, sobald du genug Punkte hast.',
		'Your ticket for all three days. Redeemed automatically as soon as you have enough points.',
		10,
		0,
		{ mandatory: true, refundable: true, pickupPlaceId: tent.id, pickupInfo: '10:00–22:00' }
	);
	const shirt = await goodie(
		'Crew-Shirt',
		'Crew shirt',
		'Bio-Baumwolle, mit dem Lindenfest-Logo auf dem Rücken.',
		'Organic cotton, with the Lindenfest logo on the back.',
		2,
		1,
		{ variants: ['S', 'M', 'L', 'XL', 'XXL'], stock: 120, advance: true, pickupPlaceId: tent.id }
	);
	await goodie(
		'Essensbon',
		'Meal voucher',
		'Ein Hauptgericht an einem der Foodtrucks.',
		'One main dish at one of the food trucks.',
		1,
		2,
		{ maxPerPerson: 6, advance: true }
	);
	await goodie(
		'Crew-Hoodie',
		'Crew hoodie',
		'Für kalte Nächte an der Theke.',
		'For cold nights at the bar.',
		16,
		3,
		{ variants: ['S', 'M', 'L', 'XL'], stock: 30, selfServiceLimit: 25 }
	);
	await goodie(
		'Helfendenparty',
		'Volunteer party',
		'Am Montag nach dem Abbau: Essen, Getränke, Musik. Nur für Leute mit mindestens einer Schicht.',
		'On Monday after teardown: food, drinks, music. For everyone with at least one shift.',
		0,
		4
	);

	// Waves -------------------------------------------------------------------
	await createWave(db, actor, editionId, {
		name: 'Crew-Vorlauf',
		opensAt: ago(35),
		closesAt: ago(28),
		areaIds: [],
		audience: 'crew'
	});
	await createWave(db, actor, editionId, {
		name: 'Hauptwelle',
		opensAt: ago(28),
		closesAt: null,
		areaIds: [],
		audience: 'everyone'
	});
	await createWave(db, actor, editionId, {
		name: 'Freundeskreis',
		opensAt: ago(14),
		closesAt: null,
		areaIds: [bar],
		audience: 'invite'
	});
	await db
		.update(bookingWaves)
		.set({ inviteCode: 'f3c1a9e27b5d4c08a6e1b2d9c7f04a63' })
		.where(eq(bookingWaves.name, 'Freundeskreis'));

	// Bookings ----------------------------------------------------------------
	const open: BookingOptions = { editionId, canSee: () => true };
	const past = { db, now: ago(10) };
	const book = (userId: string, p: ShiftPosition) =>
		tryIt(() => bookPosition(past, userId, p.id, open));

	// The helper persona and her buddy group.
	const counterFri = find('Theke', 2, '16:00');
	const tillSat = find('Bonkasse', 3, '17:00');
	const awarenessFri = find('Awareness-Team Nacht', 2, '20:00');
	const counterSunLate = find('Theke', 4, '20:00');
	const buddies = [crowd[9], crowd[10]];
	// The desk screenshot shows her arriving for this afternoon's shift, ticket and shirt waiting.
	const arriving = crowd[20];
	await book(arriving.id, pos(fence));
	await book(arriving.id, pos(power));
	await book(helper.id, pos(fence));
	await book(helper.id, pos(stageBuild, 'Team'));
	await book(helper.id, pos(counterFri, 'Theke'));
	await book(helper.id, pos(tillSat));
	await book(helper.id, pos(awarenessFri));
	for (const b of buddies) {
		await book(b.id, pos(fence));
		await book(b.id, pos(counterFri, 'Theke'));
	}
	const group = await createGroup(db, helper.id, editionId, 'Thekenkollektiv');
	for (const b of buddies) await joinGroup(db, b.id, editionId, group.inviteCode);
	await db
		.update(buddyGroups)
		.set({ inviteCode: inviteCodeFrom(Uint8Array.from({ length: 12 }, (_, i) => i * 37 + 11)) })
		.where(eq(buddyGroups.id, group.id));

	// How full each position gets (share of capacity). Some are full on purpose.
	const fill = (s: Shift, p: ShiftPosition): number => {
		if (s.id === urgentShift.id) return 1;
		if (s.id === depositShift.id) return p.capacity;
		if (s.id === counterSunLate.id && p.nameDe === 'Theke') return p.capacity;
		if (s.titleDe === 'Theke' && utcToZoned(s.startsAt, TZ).time === '20:00')
			return p.nameDe === 'Theke' ? p.capacity : 1;
		if (s.id === awarenessBriefing.id) return 7;
		if (s.titleDe === 'Awareness-Team Nacht') return 4;
		if (s.id === teardown.id) return p.nameDe === 'Team' ? 3 : 0;
		if (s.titleDe === 'Abbau Bar') return 1;
		if (s.startsAt.getTime() < Date.now() + DAY) return p.capacity;
		return Math.round(p.capacity * (0.35 + random() * 0.65));
	};
	const people = shuffle(crowd);
	let cursor = 0;
	for (const s of [...allShifts].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())) {
		for (const p of positionsOf(s)) {
			const target = fill(s, p);
			const active = await db
				.select({ id: assignments.id })
				.from(assignments)
				.where(and(eq(assignments.positionId, p.id), inArray(assignments.status, ['booked'])));
			let count = active.length;
			for (let tries = 0; count < target && tries < people.length; tries++) {
				const person = people[cursor++ % people.length];
				if ((await book(person.id, p)) !== null) count++;
			}
		}
	}
	// Waiting lists on full positions.
	await tryIt(() => joinWaitlist(past, helper.id, pos(counterSunLate, 'Theke').id, open));
	for (const person of people.slice(0, 2))
		await tryIt(() => joinWaitlist(past, person.id, pos(counterSunLate, 'Theke').id, open));
	for (const person of people.slice(5))
		if (await tryIt(() => joinWaitlist(past, person.id, pos(depositShift).id, open))) break;

	// Requests: some approved, the rest wait for the lead.
	const requested = await db
		.select({ assignment: assignments, position: shiftPositions })
		.from(assignments)
		.innerJoin(shiftPositions, eq(assignments.positionId, shiftPositions.id))
		.where(eq(assignments.status, 'requested'));
	const requestCtx = { db, now: ago(3) };
	let approvals = 0;
	for (const { assignment, position: p } of requested) {
		if (assignment.userId === helper.id) continue;
		const s = shiftById.get(assignment.shiftId)!;
		const keepPending =
			s.id === awarenessFri.id || (p.nameDe === 'Schichtleitung' && approvals % 3 === 0);
		if (!keepPending)
			await tryIt(() => decideRequest(requestCtx, actor, adminAuthz, assignment.id, true));
		approvals++;
	}

	// Attendance for the setup days (and this morning): points and automatic free tickets.
	const now = { db, now: new Date() };
	const attended = await db
		.select()
		.from(assignments)
		.where(
			and(
				inArray(assignments.shiftId, [fence.id, stageBuild.id, tents.id, barSetup.id]),
				eq(assignments.status, 'booked')
			)
		);
	for (const [i, a] of attended.entries()) {
		const status =
			![helper.id, arriving.id].includes(a.userId) && i % 9 === 4 ? 'no_show' : 'attended';
		if (a.shiftId === barSetup.id && i % 4 === 3) continue; // still on the way
		await setAttendance(now, actor, adminAuthz, a.id, status, TZ);
	}

	// Goodies: the helper picks a shirt, others too; some tickets are already handed out.
	await claimGoodie(db, { userId: helper.id }, helper.id, shirt.id, 'M', editionId);
	await claimGoodie(db, { userId: arriving.id }, arriving.id, shirt.id, 'L', editionId);
	const sizes = ['S', 'M', 'M', 'L', 'L', 'XL'];
	for (const [i, person] of crowd.slice(0, 18).entries())
		await tryIt(() =>
			claimGoodie(
				db,
				{ userId: person.id },
				person.id,
				shirt.id,
				sizes[i % sizes.length],
				editionId
			)
		);
	const claims = await db
		.select()
		.from(goodieClaims)
		.where(and(eq(goodieClaims.editionId, editionId), eq(goodieClaims.status, 'selected')));
	for (const [i, c] of claims.entries())
		if (c.userId !== helper.id && c.userId !== arriving.id && i % 3 === 0)
			await issueClaim(db, actor, c.id, { editionId, userId: c.userId }, ago(0, 2));

	// Urgent call for the ticket check that is still short of people.
	await callUrgent(
		db,
		actor,
		adminAuthz,
		pos(urgentShift).id,
		{ bonus: 2, note: 'Uns fehlen noch zwei Leute am Einlass – wer kann einspringen?' },
		ago(0, 1)
	);

	// News --------------------------------------------------------------------
	const post = async (
		authz: typeof adminAuthz,
		by: Actor,
		input: Partial<NewsInput> & Pick<NewsInput, 'titleDe' | 'titleEn' | 'bodyDe' | 'bodyEn'>,
		publishedAt: Date
	) => {
		const { post } = await publishNews(
			db,
			by,
			authz,
			editionId,
			{
				audience: 'everyone',
				areaId: null,
				shiftId: null,
				roleId: null,
				pinned: false,
				pinnedUntil: null,
				...input
			},
			false
		);
		await db
			.update(news)
			.set({ publishedAt, createdAt: publishedAt, updatedAt: publishedAt })
			.where(eq(news.id, post.id));
		return post;
	};
	await post(
		adminAuthz,
		actor,
		{
			titleDe: 'Willkommen im Lindenfest-Team!',
			titleEn: 'Welcome to the Lindenfest team!',
			bodyDe:
				'Schön, dass du dabei bist! Hier findest du alles Wichtige rund um deine Schichten.\n\n- **Helfendenzelt:** Anlaufstelle für Check-in, Goodies und Fragen\n- **Essen:** Mit deinen Essensbons an allen Foodtrucks\n- **Fragen?** Schreib uns an helfen@lindenfest.example',
			bodyEn:
				'Great to have you on board! Here you find everything about your shifts.\n\n- **Volunteer tent:** check-in, goodies and questions\n- **Food:** with your meal vouchers at all food trucks\n- **Questions?** Write to helfen@lindenfest.example',
			pinned: true
		},
		ago(21)
	);
	await post(
		adminAuthz,
		actor,
		{
			titleDe: 'Das Programm steht',
			titleEn: 'The line-up is out',
			bodyDe:
				'Drei Bühnen, über 30 Acts und ein Kinderprogramm am Sonntag. Das ganze Programm hängt im Helfendenzelt aus.',
			bodyEn:
				'Three stages, more than 30 acts and a children’s programme on Sunday. The full line-up is posted in the volunteer tent.',
			audience: 'public'
		},
		ago(9)
	);
	await post(
		adminAuthz,
		actor,
		{
			titleDe: 'Shuttle vom Bahnhof',
			titleEn: 'Shuttle from the station',
			bodyDe:
				'Ab Donnerstag fährt alle 30 Minuten ein Shuttle vom Bahnhof Beispielstadt direkt zum Crew-Parkplatz. Zeig einfach dein Bändchen oder diese App.',
			bodyEn:
				'From Thursday a shuttle runs every 30 minutes from Beispielstadt station straight to the crew car park. Just show your wristband or this app.',
			audience: 'helpers'
		},
		ago(3)
	);
	const leadAuthz = await loadAuthz(db, lead, editionId);
	const barPost = await post(
		leadAuthz,
		{ userId: lead.id },
		{
			titleDe: 'Theke: Einweisung vor der ersten Schicht',
			titleEn: 'Bar: briefing before your first shift',
			bodyDe:
				'Bitte kommt zu eurer ersten Thekenschicht **15 Minuten früher**. Wir zeigen euch Zapfanlage, Kasse und Pfandsystem.',
			bodyEn:
				'Please arrive **15 minutes early** for your first bar shift. We will show you the taps, the till and the deposit system.',
			audience: 'area',
			areaId: bar
		},
		ago(1, 3)
	);

	// E-mails from the seed would otherwise be "sent" to the log when the app starts.
	await db.update(emailOutbox).set({ sentAt: new Date() });

	// Sessions for the capture script ---------------------------------------------
	const session = async (userId: string) => (await createSession(db, userId)).token;
	const personas = {
		admin: { ...PERSONAS.admin, session: await session(admin.id) },
		lead: { ...PERSONAS.lead, session: await session(lead.id) },
		helper: { ...PERSONAS.helper, session: await session(helper.id) },
		ids: {
			festivalFrom: day(2),
			festivalTo: day(4),
			helperShift: wristbandSat.id,
			editorShift: find('Theke', 3, '20:00').id,
			urgentShift: urgentShift.id,
			barNews: barPost.id,
			areaLeadRole: areaLeadRole.id,
			helperUser: helper.id,
			deskUser: arriving.id
		}
	};
	mkdirSync(outDir, { recursive: true });
	writeFileSync(path.join(outDir, 'personas.json'), JSON.stringify(personas, null, '\t'));

	const count = (await db.select({ id: assignments.id }).from(assignments)).length;
	console.log(
		`Seeded "${edition.name}" (${day(-2)} – ${day(5)}): ${allShifts.length} shifts, ` +
			`${crowd.length + 3} people, ${count} bookings.`
	);
}

const outDir = process.argv[2];
const url = process.env.DATABASE_URL;
if (!outDir || !url) {
	console.error('Usage: DATABASE_URL=pglite://<dir> npx tsx scripts/screenshots/seed.ts <out-dir>');
	process.exit(1);
}
const database = await connect(url);
try {
	await database.migrate();
	await seed(database.db, outDir);
} finally {
	await database.close();
}
