<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import LeafletMap from '#lib/components/places/LeafletMap.svelte';
	import SitePlan from '#lib/components/places/SitePlan.svelte';
	import { assetUrl } from '#lib/assets.ts';
	import { formatCoordinates, parseCoordinates } from '#lib/domain/places.ts';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';

	type Values = {
		id?: string;
		nameDe: string;
		nameEn: string;
		descriptionDe: string;
		descriptionEn: string;
		address: string;
		lat: number | null;
		lng: number | null;
		planX: number | null;
		planY: number | null;
		sortOrder: number;
	};
	let {
		values,
		sitePlanAssetId,
		result,
		submitLabel
	}: {
		values: Values;
		sitePlanAssetId: string | null;
		result?: { error?: string; success?: string; errors?: Record<string, string> } | null;
		submitLabel: string;
	} = $props();

	const i18n = getI18n();
	// svelte-ignore state_referenced_locally
	const submitter = pendingForm({ reset: !values.id });
	const key = $derived(values.id ?? 'new');
	const e = $derived(result?.errors ?? {});

	// Local pin state (initialised once from the saved values)
	// svelte-ignore state_referenced_locally
	let coordinates = $state(
		values.lat !== null && values.lng !== null
			? formatCoordinates({ lat: values.lat, lng: values.lng })
			: ''
	);
	// svelte-ignore state_referenced_locally
	let planX = $state(values.planX);
	// svelte-ignore state_referenced_locally
	let planY = $state(values.planY);
	let mapOpen = $state(false);
	const pin = $derived(parseCoordinates(coordinates));
</script>

<form method="POST" action="?/save" class="space-y-5" use:enhance={submitter.submit}>
	<FormMessage error={result?.error} success={result?.success} />
	{#if values.id}<input type="hidden" name="id" value={values.id} />{/if}
	<input type="hidden" name="sortOrder" value={values.sortOrder} />
	<div class="grid gap-4 sm:grid-cols-2">
		<Field
			id="pn-{key}"
			label={i18n.t('admin.places.nameDe')}
			name="nameDe"
			value={values.nameDe}
			error={e.nameDe}
		/>
		<Field
			id="pe-{key}"
			label={i18n.t('admin.places.nameEn')}
			name="nameEn"
			optional
			value={values.nameEn}
		/>
	</div>
	<Field
		id="pa-{key}"
		label={i18n.t('admin.places.address')}
		name="address"
		optional
		value={values.address}
	/>
	<div class="grid gap-4 sm:grid-cols-2">
		{#each [{ name: 'descriptionDe', label: 'admin.places.descriptionDe' }, { name: 'descriptionEn', label: 'admin.places.descriptionEn' }] as const as d (d.name)}
			<div class="space-y-1.5">
				<label for="{d.name}-{key}" class="flex justify-between text-sm font-medium"
					>{i18n.t(d.label)}<span class="text-xs font-normal text-ink-muted"
						>{i18n.t('common.optional')}</span
					></label
				>
				<textarea id="{d.name}-{key}" name={d.name} rows="2" class="block w-full"
					>{values[d.name]}</textarea
				>
			</div>
		{/each}
	</div>

	<fieldset class="space-y-2">
		<legend class="mb-1 w-full border-b border-ink pb-1 text-sm font-bold"
			>{i18n.t('admin.places.planPin')}</legend
		>
		{#if sitePlanAssetId}
			<p class="text-sm text-ink-muted">{i18n.t('admin.places.planHint')}</p>
			<SitePlan
				src={assetUrl(sitePlanAssetId)}
				x={planX}
				y={planY}
				label={i18n.t('admin.places.planPin')}
				onpick={(p) => ((planX = p.x), (planY = p.y))}
			/>
			<input type="hidden" name="planX" value={planX ?? ''} />
			<input type="hidden" name="planY" value={planY ?? ''} />
			{#if planX !== null}<Button
					type="button"
					size="sm"
					variant="ghost"
					onclick={() => ((planX = null), (planY = null))}
					>{i18n.t('admin.places.removePin')}</Button
				>{/if}
		{:else}
			<p class="text-sm text-ink-muted">{i18n.t('admin.places.noPlan')}</p>
		{/if}
	</fieldset>

	<fieldset class="space-y-2">
		<legend class="mb-1 w-full border-b border-ink pb-1 text-sm font-bold"
			>{i18n.t('admin.places.coordinates')}</legend
		>
		<Field
			id="pc-{key}"
			label={i18n.t('admin.places.coordinates')}
			name="coordinates"
			optional
			bind:value={coordinates}
			hint={i18n.t('admin.places.coordinatesHint')}
			error={e.coordinates}
		/>
		{#if mapOpen}
			{#key mapOpen}
				<LeafletMap
					lat={pin?.lat ?? null}
					lng={pin?.lng ?? null}
					tileUrl={page.data.settings.mapTileUrl}
					attribution={page.data.settings.mapAttribution}
					onpick={(p) => (coordinates = formatCoordinates(p))}
				/>
			{/key}
		{:else}
			<Button type="button" size="sm" variant="secondary" onclick={() => (mapOpen = true)}
				>{i18n.t('admin.places.loadMap')}</Button
			>
		{/if}
	</fieldset>

	<Button type="submit" loading={submitter.pending}>{submitLabel}</Button>
</form>
