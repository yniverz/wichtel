import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Group e-mails are now news posts with "also send by e-mail". */
export const load: PageServerLoad = ({ url }) => {
	const shift = url.searchParams.get('shift');
	redirect(308, shift ? `/admin/news/new?shift=${encodeURIComponent(shift)}` : '/admin/news');
};
