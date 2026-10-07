import {
	authorizationServerMetadata,
	corsPreflight,
	jsonResponse
} from '#lib/server/oauth-http.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => jsonResponse(authorizationServerMetadata());
export const OPTIONS: RequestHandler = () => corsPreflight();
