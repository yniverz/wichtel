<script lang="ts" module>
	export interface PlaceInfo {
		nameDe: string;
		nameEn: string;
		descriptionDe: string;
		descriptionEn: string;
		address: string;
		lat: number | null;
		lng: number | null;
		planX: number | null;
		planY: number | null;
	}
</script>

<script lang="ts">
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import { assetUrl } from '#lib/assets.ts';
	import { mapLinks } from '#lib/domain/places.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized } from '#lib/i18n/index.ts';
	import LeafletMap from './LeafletMap.svelte';
	import SitePlan from './SitePlan.svelte';

	/** Everything to find a place: site plan, optional map (on request), navigation links. */
	let { place, sitePlanAssetId = null }: { place: PlaceInfo; sitePlanAssetId?: string | null } =
		$props();
	const i18n = getI18n();
	const settings = $derived(page.data.settings);
	const links = $derived(mapLinks(place));
	let showMap = $state(false);
	const hasPlan = $derived(
		sitePlanAssetId !== null && place.planX !== null && place.planY !== null
	);
	const hasGeo = $derived(place.lat !== null && place.lng !== null);
</script>

<div class="space-y-3">
	<div>
		<p class="font-bold">{localized(place, 'name', i18n.locale)}</p>
		{#if place.address}<p class="text-sm text-ink-muted">{place.address}</p>{/if}
		{#if localized(place, 'description', i18n.locale)}
			<p class="mt-1 text-sm whitespace-pre-line">{localized(place, 'description', i18n.locale)}</p>
		{/if}
	</div>

	{#if hasPlan && sitePlanAssetId}
		<SitePlan
			src={assetUrl(sitePlanAssetId)}
			x={place.planX}
			y={place.planY}
			label={localized(place, 'name', i18n.locale)}
		/>
	{/if}

	{#if hasGeo}
		{#if showMap}
			<LeafletMap
				lat={place.lat}
				lng={place.lng}
				tileUrl={settings.mapTileUrl}
				attribution={settings.mapAttribution}
			/>
		{:else}
			<div class="rounded-md border border-dashed border-line p-3 text-sm">
				<p class="text-ink-muted">
					{i18n.t('places.mapConsent', {
						host: new URL(settings.mapTileUrl.replace(/\{[^}]+\}/g, 'a')).host
					})}
				</p>
				<Button size="sm" variant="secondary" class="mt-2" onclick={() => (showMap = true)}
					>{i18n.t('places.loadMap')}</Button
				>
			</div>
		{/if}
	{/if}

	{#if links}
		<p class="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
			<span class="font-normal text-ink-muted">{i18n.t('places.openIn')}</span>
			<a href={links.google} target="_blank" rel="noopener" class="text-brand-text hover:underline"
				>Google Maps</a
			>
			<a href={links.apple} target="_blank" rel="noopener" class="text-brand-text hover:underline"
				>Apple Karten</a
			>
			<a href={links.osm} target="_blank" rel="noopener" class="text-brand-text hover:underline"
				>OpenStreetMap</a
			>
		</p>
	{/if}
</div>
