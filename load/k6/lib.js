// Shared helpers for the k6 scenarios: the fixture written by `load/db.ts seed`, requests that
// look like the SvelteKit client, and a few metrics.
import http from 'k6/http';
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';
import { Counter, Trend } from 'k6/metrics';

const FIXTURE = __ENV.FIXTURE || '../out/fixture.json';
const fixture = () => JSON.parse(open(FIXTURE));

export const BASE = (__ENV.BASE_URL || JSON.parse(open(FIXTURE)).baseUrl).replace(/\/$/, '');
export const PASSWORD = fixture().password;
export const helpers = new SharedArray('helpers', () => fixture().helpers);
export const leads = new SharedArray('leads', () => fixture().leads);
export const positions = new SharedArray('positions', () => fixture().positions);
const cumulative = new SharedArray('weights', () => {
	let sum = 0;
	return fixture().positions.map((p) => (sum += p.w));
});

export const bookingTime = new Trend('booking_duration', true);
export const pageTime = new Trend('page_duration', true);
export const dataTime = new Trend('data_duration', true);
export const outcome = new Counter('booking_outcome');
/** Page and data responses by status (503 = turned away when busy, 0 = timeout). */
export const loadStatus = new Counter('load_status');

const host = BASE.replace(/^https?:\/\//, '');
const proto = BASE.startsWith('https') ? 'https' : 'http';

/**
 * Headers a reverse proxy would add. Every simulated person gets their own client address, so the
 * per-address limits behave as with real visitors.
 */
export function headers(session, extra = {}) {
	const id = exec.vu.idInTest;
	const h = {
		'x-forwarded-for': `10.${(id >> 16) & 255}.${(id >> 8) & 255}.${id & 255}`,
		'x-forwarded-proto': proto,
		'x-forwarded-host': host,
		'accept-language': 'de-DE,de;q=0.9',
		...extra
	};
	if (session) h.cookie = `wichtel_session=${session}`;
	return h;
}

const seenAssets = {};

/** A full page load: HTML, plus the scripts and styles on the first visit (then cached). */
export function page(path, session, name = path) {
	const res = http.get(`${BASE}${path}`, {
		headers: headers(session, { accept: 'text/html' }),
		tags: { name, kind: 'page' },
		redirects: 0
	});
	pageTime.add(res.timings.duration, { name });
	loadStatus.add(1, { status: String(res.status) });
	const vu = exec.vu.idInTest;
	if (res.status === 200 && !seenAssets[vu]) {
		seenAssets[vu] = true;
		const assets = [...new Set(String(res.body).match(/\/_app\/immutable\/[^"']+/g) || [])];
		if (assets.length)
			http.batch(
				assets.map((a) => ['GET', `${BASE}${a}`, null, { tags: { name: 'asset', kind: 'asset' } }])
			);
	}
	return res;
}

/** Client-side navigation or refresh after a form action: only the data of the page. */
export function data(path, session, name = path) {
	const res = http.get(`${BASE}${path}/__data.json`, {
		headers: headers(session),
		tags: { name: `${name} (data)`, kind: 'data' }
	});
	dataTime.add(res.timings.duration, { name });
	loadStatus.add(1, { status: String(res.status) });
	return res;
}

/** A form action as sent by `use:enhance`. Returns the outcome key, e.g. `error.positionFull`. */
export function action(path, name, fields, session) {
	const res = http.post(`${BASE}${path}?/${name}`, fields, {
		headers: headers(session, {
			origin: BASE,
			accept: 'application/json',
			'x-sveltekit-action': 'true'
		}),
		tags: { name: `${path}?/${name}`, kind: 'action' },
		responseCallback: http.expectedStatuses(200, 400, 409)
	});
	// Rule violations (place taken, overlap …) come back as a failure with status 400/409.
	let result = `http_${res.status}`;
	const body = String(res.body || '');
	if (body.startsWith('{"type":"success"')) result = 'success';
	else if (body.startsWith('{"type":"failure"'))
		result = (body.match(/error\.[A-Za-z.]+/) || ['failure'])[0];
	return { res, result };
}

/** A position, weighted by popularity (some shifts are wanted by many). */
export function popularPosition() {
	const total = cumulative[cumulative.length - 1];
	const target = Math.random() * total;
	let lo = 0;
	let hi = cumulative.length - 1;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (cumulative[mid] < target) lo = mid + 1;
		else hi = mid;
	}
	return positions[lo];
}

export const between = (min, max) => min + Math.random() * (max - min);
