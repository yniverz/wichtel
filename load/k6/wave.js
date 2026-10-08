// Booking wave: many people wait for the wave to open and then book at the same moment.
//
//   npx tsx load/db.ts wave 150          (prints WAVE_AT)
//   k6 run -e WAVE_AT=<ms> -e PEOPLE=1500 load/k6/wave.js
//
// PEOPLE      people taking part (default 1500, at most the seeded helpers)
// EARLY       seconds before the opening in which people open the shift list (default 120)
// REACTION    mean reaction time after the opening in seconds (default 6); a few are much slower
// WANTS       maximum number of shifts a person wants (default 4)
import { sleep } from 'k6';
import {
	action,
	between,
	bookingTime,
	data,
	helpers,
	outcome,
	page,
	popularPosition
} from './lib.js';

const WAVE_AT = Number(__ENV.WAVE_AT);
if (!WAVE_AT) throw new Error('Set WAVE_AT (printed by `load/db.ts wave`).');
const PEOPLE = Math.min(Number(__ENV.PEOPLE || 1500), helpers.length);
const EARLY = Number(__ENV.EARLY || 120);
const REACTION = Number(__ENV.REACTION || 6);
const WANTS = Number(__ENV.WANTS || 4);
const BREAK = 30 * 60 * 1000;

const untilWave = Math.max(0, (WAVE_AT - Date.now()) / 1000);

export const options = {
	scenarios: {
		wave: {
			executor: 'per-vu-iterations',
			vus: PEOPLE,
			iterations: 1,
			maxDuration: `${Math.ceil(untilWave + 600)}s`
		}
	},
	thresholds: {
		...Object.fromEntries(
			[
				'success',
				'error.positionFull',
				'error.overlap',
				'error.alreadyBooked',
				'error.bookingClosed'
			].map((r) => [`booking_outcome{result:${r}}`, ['count>=0']])
		),
		...Object.fromEntries(
			['200', '503', '0'].map((st) => [`load_status{status:${st}}`, ['count>=0']])
		),
		booking_duration: ['p(95)<1000'],
		'http_req_failed{kind:action}': ['rate<0.01']
	},
	summaryTrendStats: ['med', 'p(90)', 'p(95)', 'p(99)', 'max']
};

const waitUntil = (ms) => {
	const s = (ms - Date.now()) / 1000;
	if (s > 0) sleep(s);
};

export default function () {
	const me = helpers[__VU - 1];

	// Before the opening: open the shift list and look around; some reload once more.
	waitUntil(WAVE_AT - between(0, EARLY) * 1000);
	page('/app/shifts', me.session);
	if (Math.random() < 0.3) {
		waitUntil(WAVE_AT - between(0, 10) * 1000);
		page('/app/shifts', me.session);
	}

	// The opening: most react within seconds, a few much later.
	waitUntil(WAVE_AT + Math.min(120, -Math.log(1 - Math.random()) * REACTION) * 1000);
	if (Math.random() < 0.5) page('/app/shifts', me.session);
	else data('/app/shifts', me.session);

	const wants = 1 + Math.floor(Math.random() * WANTS);
	const mine = [];
	const tried = new Set();
	for (let attempt = 0; attempt < wants + 6 && mine.length < wants; attempt++) {
		// People do not click on shifts that collide with their own (the list marks them).
		let p;
		for (let i = 0; i < 20; i++) {
			const candidate = popularPosition();
			const clash = mine.some((m) => candidate.s < m.e + BREAK && m.s < candidate.e + BREAK);
			if (!tried.has(candidate.id) && !clash) {
				p = candidate;
				break;
			}
		}
		if (!p) break;
		tried.add(p.id);
		sleep(between(1, 4)); // reading the shift, tapping the button
		const { res, result } = action('/app/shifts', 'book', { positionId: p.id }, me.session);
		bookingTime.add(res.timings.duration);
		outcome.add(1, { result });
		if (result === 'success') {
			mine.push(p);
			data('/app/shifts', me.session); // use:enhance reloads the page data
		}
	}

	// Afterwards: check the own shifts on the home page.
	sleep(between(2, 10));
	data('/app', me.session);
}
