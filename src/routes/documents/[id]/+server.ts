import { error } from '@sveltejs/kit';
import { config, db } from '#lib/server/app.ts';
import { requireUser } from '#lib/server/guards.ts';
import { readPrivateDocument } from '#lib/server/private-files.ts';
import { getCurrentEdition } from '#lib/server/services/editions.ts';
import { documentOf } from '#lib/server/services/qualifications.ts';
import { loadAuthz } from '#lib/server/services/roles.ts';
import type { RequestHandler } from './$types';

/** A qualification proof. Visible to its owner and to people allowed to view documents. */
export const GET: RequestHandler = async (event) => {
	const user = requireUser(event);
	if (!/^[0-9a-f-]{36}$/i.test(event.params.id)) error(404, 'error.notFound');
	const doc = await documentOf(db(), event.params.id);
	if (!doc?.documentId) error(404, 'error.notFound');
	if (doc.userId !== user.id) {
		const edition = await getCurrentEdition(db());
		const authz = await loadAuthz(db(), user, edition?.id ?? null);
		if (!authz.canSomewhere('qualification.documents.view')) error(403, 'error.forbidden');
	}
	const body = await readPrivateDocument(config.uploadDir, doc.documentId);
	if (!body) error(404, 'error.notFound');
	return new Response(new Uint8Array(body), {
		headers: {
			'content-type': doc.documentType ?? 'application/octet-stream',
			'content-disposition': `inline; filename="${(doc.documentName ?? 'document').replace(/[^\w.-]+/g, '_')}"`,
			'cache-control': 'private, no-store',
			'content-security-policy':
				"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
			'x-content-type-options': 'nosniff'
		}
	});
};
