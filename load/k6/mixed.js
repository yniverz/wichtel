// Everyday use during the season and the festival: helpers look at their shifts and book now and
// then, leads work in the admin area, calendar apps poll the iCal feeds. A probe measures how
// long a trivial request waits (a sign that the server is saturated).
//
// Run `npx tsx load/db.ts wave 0` first so booking is open.
//
//   k6 run -e PROFILE=stress load/k6/mixed.js
//
// PROFILE   steady: constant load (RATE visits/s, DURATION minutes)
//           stress: rises step by step up to RATE visits/s to find the limit (default)
//           soak:   constant load for DURATION minutes, to find leaks
// RATE      visits per second (steady/soak, default 3) or the highest rate (stress, default 60)
// DURATION  minutes (steady default 10, soak default 60)
import { sleep } from 'k6';
import http from 'k6/http';
import { Trend } from 'k6/metrics';
import {
	BASE,
	action,
	between,
	bookingTime,
	data,
	headers,
	helpers,
	leads,
	outcome,
	page,
	popularPosition
} from './lib.js';

const PROFILE = __ENV.PROFILE || 'stress';
const probeTime = new Trend('probe_duration', true);

function visitStages() {
	if (PROFILE === 'stress') {
		const top = Number(__ENV.RATE || 60);
		const stages = [];
		const step = Math.max(1, Math.round(top / 12));
		for (let r = step; r <= top; r += step)
			stages.push({ target: r, duration: '20s' }, { target: r, duration: '60s' });
		return stages;
	}
	const rate = Number(__ENV.RATE || 3);
	const minutes = Number(__ENV.DURATION || (PROFILE === 'soak' ? 60 : 10));
	return [
		{ target: rate, duration: '30s' },
		{ target: rate, duration: `${minutes}m` }
	];
}

const stages = visitStages();
const scale = (share) =>
	stages.map((s) => ({ ...s, target: Math.max(1, Math.ceil(s.target * share)) }));
const total = stages.reduce(
	(sum, s) => sum + parseInt(s.duration) * (s.duration.endsWith('m') ? 60 : 1),
	0
);

export const options = {
	scenarios: {
		helpers: {
			executor: 'ramping-arrival-rate',
			exec: 'helperVisit',
			startRate: 1,
			timeUnit: '1s',
			preAllocatedVUs: 100,
			maxVUs: 5000,
			stages
		},
		leads: {
			executor: 'ramping-arrival-rate',
			exec: 'leadVisit',
			startRate: 1,
			timeUnit: '10s',
			preAllocatedVUs: 10,
			maxVUs: 500,
			stages: scale(0.5)
		},
		calendars: {
			executor: 'ramping-arrival-rate',
			exec: 'calendarPoll',
			startRate: 1,
			timeUnit: '1s',
			preAllocatedVUs: 10,
			maxVUs: 500,
			stages: scale(0.5)
		},
		probe: {
			executor: 'constant-arrival-rate',
			exec: 'probe',
			rate: 1,
			timeUnit: '1s',
			duration: `${total}s`,
			preAllocatedVUs: 5
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
		'http_req_duration{kind:page}': [
			{ threshold: 'p(95)<2000', abortOnFail: PROFILE === 'stress', delayAbortEval: '30s' }
		],
		http_req_failed: [
			{ threshold: 'rate<0.05', abortOnFail: PROFILE === 'stress', delayAbortEval: '30s' }
		]
	},
	summaryTrendStats: ['med', 'p(90)', 'p(95)', 'p(99)', 'max']
};

/** One helper opening the app on their phone and doing a few things. */
export function helperVisit() {
	const me = helpers[Math.floor(Math.random() * helpers.length)];
	page('/app', me.session);
	sleep(between(2, 8));
	const r = Math.random();
	if (r < 0.6) {
		data('/app/shifts', me.session);
		sleep(between(5, 20));
		if (Math.random() < 0.25) {
			const p = popularPosition();
			const { res, result } = action('/app/shifts', 'book', { positionId: p.id }, me.session);
			bookingTime.add(res.timings.duration);
			outcome.add(1, { result });
			if (result === 'success') data('/app/shifts', me.session);
		}
	} else if (r < 0.75) {
		data('/app/profile', me.session);
	} else if (r < 0.85) {
		data('/app/goodies', me.session);
	} else if (r < 0.9) {
		data('/app/group', me.session);
	}
}

/** A lead checking the dashboard and the shift plan. */
export function leadVisit() {
	const me = leads[Math.floor(Math.random() * leads.length)];
	page('/admin', me.session);
	sleep(between(3, 10));
	data('/admin/shifts', me.session);
	sleep(between(5, 15));
	data('/admin/people', me.session);
}

/** Calendar apps fetch the personal feed every few minutes to hours. */
export function calendarPoll() {
	const me = helpers[Math.floor(Math.random() * helpers.length)];
	http.get(`${BASE}/calendar/${me.calendar}.ics`, {
		headers: headers(null),
		tags: { name: 'calendar', kind: 'calendar' }
	});
}

export function probe() {
	const res = http.get(`${BASE}/healthz`, {
		headers: headers(null),
		tags: { name: 'probe', kind: 'probe' }
	});
	probeTime.add(res.timings.duration);
}
