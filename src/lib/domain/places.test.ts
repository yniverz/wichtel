import { describe, expect, it } from 'vitest';
import { mapLinks, parseCoordinates } from './places.ts';

describe('places', () => {
	it('parses coordinates from text and map URLs', () => {
		expect(parseCoordinates('50.1109, 8.6821')).toEqual({ lat: 50.1109, lng: 8.6821 });
		expect(parseCoordinates('50,1109 8,6821')).toEqual({ lat: 50.1109, lng: 8.6821 });
		expect(parseCoordinates('https://www.google.com/maps/place/x/@50.1109,8.6821,17z')).toEqual({
			lat: 50.1109,
			lng: 8.6821
		});
		expect(
			parseCoordinates('https://www.openstreetmap.org/?mlat=50.11&mlon=8.68#map=18/50.11/8.68')
		).toEqual({ lat: 50.11, lng: 8.68 });
		expect(parseCoordinates('Hauptstraße 1')).toBeNull();
		expect(parseCoordinates('95, 8')).toBeNull();
	});

	it('builds navigation links from pin or address', () => {
		expect(mapLinks({ nameDe: 'Tor 3', address: '', lat: 50.1, lng: 8.6 })?.google).toBe(
			'https://www.google.com/maps/search/?api=1&query=50.1,8.6'
		);
		expect(
			mapLinks({ nameDe: 'Tor 3', address: 'Mensaweg 1, Darmstadt', lat: null, lng: null })?.apple
		).toBe('https://maps.apple.com/?q=Mensaweg%201%2C%20Darmstadt');
		expect(mapLinks({ nameDe: 'Tor 3', address: '', lat: null, lng: null })).toBeNull();
	});
});
