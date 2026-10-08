// Login rush: many people sign in within a short time (e.g. after a newsletter). Logging in
// verifies an Argon2 hash, which is deliberately expensive; this scenario finds how many logins
// per second the server manages.
//
//   k6 run -e RATE=20 load/k6/login.js
//
// RATE        highest logins per second (default 20); reached in steps over STEP seconds each
// STEP        seconds per step (default 30)
import { check } from 'k6';
import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { BASE, PASSWORD, headers, helpers } from './lib.js';

const RATE = Number(__ENV.RATE || 20);
const STEP = Number(__ENV.STEP || 30);
const loginTime = new Trend('login_duration', true);

const steps = [];
for (let r = Math.max(1, Math.round(RATE / 5)); r <= RATE; r += Math.max(1, Math.round(RATE / 5)))
	steps.push({ target: r, duration: '5s' }, { target: r, duration: `${STEP}s` });

export const options = {
	scenarios: {
		login: {
			executor: 'ramping-arrival-rate',
			startRate: 1,
			timeUnit: '1s',
			preAllocatedVUs: 50,
			maxVUs: 2000,
			stages: steps
		}
	},
	thresholds: { login_duration: ['p(95)<2000'] },
	summaryTrendStats: ['med', 'p(90)', 'p(95)', 'p(99)', 'max']
};

export default function () {
	const me = helpers[Math.floor(Math.random() * helpers.length)];
	const res = http.post(
		`${BASE}/login`,
		{ email: me.email, password: PASSWORD },
		{ headers: headers(null, { origin: BASE }), redirects: 0, tags: { name: 'login' } }
	);
	loginTime.add(res.timings.duration);
	check(res, {
		'logged in': (r) => /wichtel_session=/.test(r.headers['Set-Cookie'] || '')
	});
}
