/** Places: coordinates and links to map apps. Pure – used on server and client. */

export interface GeoPin {
	lat: number;
	lng: number;
}

export interface PlaceLike {
	nameDe: string;
	address: string;
	lat: number | null;
	lng: number | null;
}

/** Accepts "50.1109, 8.6821", "50,1109 8,6821" or a Google/OSM URL containing coordinates. */
export function parseCoordinates(input: string): GeoPin | null {
	const text = input.trim();
	if (!text) return null;
	const fromUrl =
		text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ??
		text.match(/[?&](?:q|query|ll|mlat)=(-?\d+\.\d+)(?:,|&mlon=)(-?\d+\.\d+)/);
	const plain = text.match(/^(-?\d{1,3}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
	const m = fromUrl ?? plain;
	if (!m) return null;
	const lat = Number(m[1].replace(',', '.'));
	const lng = Number(m[2].replace(',', '.'));
	if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
		return null;
	return { lat, lng };
}

export function formatCoordinates(pin: GeoPin): string {
	return `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`;
}

export interface MapLinks {
	google: string;
	apple: string;
	osm: string;
}

/** Links that open the place in common map apps (for navigation). Null if nothing to show. */
export function mapLinks(place: PlaceLike): MapLinks | null {
	const label = encodeURIComponent(place.nameDe);
	if (place.lat !== null && place.lng !== null) {
		const ll = `${place.lat},${place.lng}`;
		return {
			google: `https://www.google.com/maps/search/?api=1&query=${ll}`,
			apple: `https://maps.apple.com/?ll=${ll}&q=${label}`,
			osm: `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=18/${place.lat}/${place.lng}`
		};
	}
	if (place.address.trim()) {
		const q = encodeURIComponent(place.address);
		return {
			google: `https://www.google.com/maps/search/?api=1&query=${q}`,
			apple: `https://maps.apple.com/?q=${q}`,
			osm: `https://www.openstreetmap.org/search?query=${q}`
		};
	}
	return null;
}
