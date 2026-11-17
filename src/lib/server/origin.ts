import type { RequestEvent } from '@sveltejs/kit';

/**
 * The Node adapter takes the scheme of a request from `PROTOCOL_HEADER` (X-Forwarded-Proto, set
 * by the reverse proxy) and assumes https when that header is missing – also when the app is
 * opened directly over plain http, without a proxy. Form posts then fail the CSRF check (the
 * browser sends an http origin) and cookies get the `Secure` flag, which browsers drop over http.
 *
 * So without that header, an http `PUBLIC_URL` decides: the operator states there that the app
 * is reached over plain http. Only https can turn into http this way, and only when the operator
 * configured http; the host still comes from the request. Behind a proxy that sends the header,
 * and with an https `PUBLIC_URL`, nothing changes.
 */
let plainHttp = false;
let protocolHeader: string | undefined;

/** Set at startup. `header` is the adapter's `PROTOCOL_HEADER`. */
export function configureOrigin(publicUrl: string, header: string | undefined) {
	plainHttp = publicUrl.startsWith('http://');
	protocolHeader = header?.trim().toLowerCase() || undefined;
}

/** The URL of the request as the browser sees it (see above). */
export function requestUrl(event: Pick<RequestEvent, 'url' | 'request'>): URL {
	const { url, request } = event;
	if (!plainHttp || url.protocol !== 'https:') return url;
	if (protocolHeader && request.headers.has(protocolHeader)) return url;
	const corrected = new URL(url);
	corrected.protocol = 'http:';
	return corrected;
}
