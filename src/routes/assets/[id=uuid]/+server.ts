import { error } from '@sveltejs/kit';
import { config, db } from '#lib/server/app.ts';
import { readAsset } from '#lib/server/services/assets.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const asset = await readAsset(db(), config.uploadDir, params.id);
	if (!asset) error(404, 'error.notFound');
	return new Response(new Uint8Array(asset.body), {
		headers: {
			'content-type': asset.mimeType,
			// Asset ids never change content, so they can be cached forever.
			'cache-control': 'public, max-age=31536000, immutable',
			// Uploaded SVGs must never run scripts, even when opened directly.
			'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
			'x-content-type-options': 'nosniff'
		}
	});
};
