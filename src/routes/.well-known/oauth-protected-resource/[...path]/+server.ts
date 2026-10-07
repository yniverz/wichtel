import { corsPreflight, jsonResponse, protectedResourceMetadata } from '#lib/server/oauth-http.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => jsonResponse(protectedResourceMetadata());
export const OPTIONS: RequestHandler = () => corsPreflight();
