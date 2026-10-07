<script lang="ts">
	import { onMount } from 'svelte';
	import type { Map as LeafletMapType, Marker } from 'leaflet';

	/**
	 * Interactive map. Leaflet and the tiles are only loaded when this component is mounted, which
	 * callers do after the viewer explicitly asked for the map.
	 */
	let {
		lat,
		lng,
		tileUrl,
		attribution,
		zoom = 17,
		onpick
	}: {
		lat: number | null;
		lng: number | null;
		tileUrl: string;
		attribution: string;
		zoom?: number;
		/** If set, clicking the map moves the pin and reports the position. */
		onpick?: (pin: { lat: number; lng: number }) => void;
	} = $props();

	let container: HTMLDivElement | undefined = $state();
	let map: LeafletMapType | undefined;
	let marker: Marker | undefined;

	onMount(() => {
		let cancelled = false;
		(async () => {
			const L = (await import('leaflet')).default;
			await import('leaflet/dist/leaflet.css');
			if (cancelled || !container) return;
			const center: [number, number] = lat !== null && lng !== null ? [lat, lng] : [51.163, 10.447];
			map = L.map(container, { scrollWheelZoom: false }).setView(center, lat !== null ? zoom : 6);
			L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);
			const icon = L.divIcon({
				className: '',
				html: '<span class="wichtel-pin"></span>',
				iconSize: [28, 28],
				iconAnchor: [14, 28]
			});
			if (lat !== null && lng !== null) marker = L.marker(center, { icon }).addTo(map);
			if (onpick) {
				map.on('click', (e) => {
					const pos = e.latlng;
					if (marker) marker.setLatLng(pos);
					else marker = L.marker(pos, { icon }).addTo(map!);
					onpick({ lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) });
				});
			}
		})();
		return () => {
			cancelled = true;
			map?.remove();
		};
	});
</script>

<div
	bind:this={container}
	class="h-72 w-full overflow-hidden rounded-md border border-line bg-surface"
></div>

<style>
	:global(.wichtel-pin) {
		display: block;
		width: 28px;
		height: 28px;
		border-radius: 50% 50% 50% 0;
		transform: rotate(-45deg);
		background: var(--brand, #c03a1c);
		border: 3px solid #fff;
		box-shadow: 0 2px 6px rgb(0 0 0 / 0.45);
	}
</style>
