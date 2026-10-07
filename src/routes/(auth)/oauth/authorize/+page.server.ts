import { fail, redirect } from '@sveltejs/kit';
import { db } from '#lib/server/app.ts';
import { requireVerifiedUser } from '#lib/server/guards.ts';
import { canUseMcp } from '#lib/server/mcp/access.ts';
import { createCode, OAuthError, validateAuthorization } from '#lib/server/services/oauth.ts';
import type { Actions, PageServerLoad } from './$types';

/** The parameters of the authorization request travel through the consent form unchanged. */
const PARAMS = [
	'client_id',
	'redirect_uri',
	'response_type',
	'code_challenge',
	'code_challenge_method',
	'state',
	'scope',
	'resource'
];

export const load: PageServerLoad = async (event) => {
	const user = requireVerifiedUser(event);
	try {
		const request = await validateAuthorization(db(), event.url.searchParams);
		const allowed = await canUseMcp(db(), user);
		return {
			ok: true as const,
			allowed,
			clientName: request.client.name,
			redirectHost: new URL(request.redirectUri).host,
			params: PARAMS.map((name) => [name, event.url.searchParams.get(name) ?? '']).filter(
				([, value]) => value !== ''
			)
		};
	} catch (e) {
		if (e instanceof OAuthError) return { ok: false as const, error: e.description };
		throw e;
	}
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireVerifiedUser(event);
		const form = await event.request.formData();
		const params = new URLSearchParams();
		for (const name of PARAMS) {
			const value = form.get(name);
			if (typeof value === 'string' && value) params.set(name, value);
		}
		let request;
		try {
			request = await validateAuthorization(db(), params);
		} catch (e) {
			if (e instanceof OAuthError) return fail(400, { error: e.description });
			throw e;
		}
		// Only back to the redirect URI registered (and checked) for this app.
		const target = new URL(request.redirectUri);
		if (request.state) target.searchParams.set('state', request.state);
		if (form.get('decision') !== 'allow' || !(await canUseMcp(db(), user))) {
			target.searchParams.set('error', 'access_denied');
			redirect(303, target.toString(), { external: [target.origin] });
		}
		const code = await createCode(db(), {
			clientId: request.client.id,
			userId: user.id,
			redirectUri: request.redirectUri,
			codeChallenge: request.codeChallenge,
			scope: form.get('access') === 'read' ? 'read' : 'write'
		});
		target.searchParams.set('code', code);
		redirect(303, target.toString(), { external: [target.origin] });
	}
};
