<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import PlaceForm from '#lib/components/admin/PlaceForm.svelte';
	import SitePlan from '#lib/components/places/SitePlan.svelte';
	import { assetUrl } from '#lib/assets.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	type Result = {
		action?: string;
		error?: string;
		success?: string;
		errors?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const empty = {
		nameDe: '',
		nameEn: '',
		descriptionDe: '',
		descriptionEn: '',
		address: '',
		lat: null,
		lng: null,
		planX: null,
		planY: null,
		sortOrder: 0
	};
</script>

<svelte:head
	><title>{i18n.t('admin.places.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.places.title')} lead={i18n.t('admin.places.lead')} />

<div class="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
	<section aria-labelledby="places" class="space-y-3">
		<h2 id="places" class="border-b-2 border-ink pb-1 text-sm font-bold">
			{i18n.t('admin.nav.places')}
		</h2>
		{#if data.places.length === 0}<p class="text-sm text-ink-muted">
				{i18n.t('admin.places.empty')}
			</p>{/if}
		{#each data.places as p (p.id)}
			<details
				class="rounded-md border border-line bg-surface-raised"
				open={result?.action === p.id && !!result.errors}
			>
				<summary class="flex cursor-pointer flex-wrap items-baseline gap-x-3 px-4 py-3">
					<span class="font-semibold">{localized(p, 'name', i18n.locale)}</span>
					<span class="text-sm text-ink-muted">
						{[
							p.planX !== null ? i18n.t('admin.places.onPlan') : '',
							p.lat !== null ? i18n.t('admin.places.onMap') : ''
						]
							.filter(Boolean)
							.join(' · ')}
						{#if data.deskPlaceId === p.id}
							· {i18n.t('admin.places.desk')}{/if}
					</span>
				</summary>
				<div class="space-y-5 border-t border-line p-4">
					<PlaceForm
						values={p}
						sitePlanAssetId={data.sitePlanAssetId}
						result={result?.action === p.id ? result : null}
						submitLabel={i18n.t('common.save')}
					/>
					<ConfirmForm
						action="?/delete"
						hidden={{ id: p.id }}
						message={i18n.t('admin.places.deleteConfirm', { name: p.nameDe })}
						confirmLabel={i18n.t('common.delete')}
					>
						{i18n.t('common.delete')}
					</ConfirmForm>
				</div>
			</details>
		{/each}
		<details
			class="rounded-md border border-dashed border-line"
			open={data.places.length === 0 || result?.action === 'new'}
		>
			<summary class="cursor-pointer px-4 py-3 font-semibold text-brand-text"
				>+ {i18n.t('admin.places.new')}</summary
			>
			<div class="border-t border-line p-4">
				<PlaceForm
					values={empty}
					sitePlanAssetId={data.sitePlanAssetId}
					result={result?.action === 'new' ? result : null}
					submitLabel={i18n.t('common.create')}
				/>
			</div>
		</details>
	</section>

	<aside class="space-y-10">
		<section aria-labelledby="plan" class="space-y-3">
			<h2 id="plan" class="border-b-2 border-ink pb-1 text-sm font-bold">
				{i18n.t('admin.places.sitePlan')}
			</h2>
			<p class="text-sm text-ink-muted">{i18n.t('admin.places.sitePlanHint')}</p>
			{#if result?.action === 'plan'}<FormMessage
					error={result.error}
					success={result.success}
				/>{/if}
			{#if data.sitePlanAssetId}
				<SitePlan src={assetUrl(data.sitePlanAssetId)} x={null} y={null} />
			{/if}
			<form
				method="POST"
				action="?/plan"
				enctype="multipart/form-data"
				use:enhance
				class="flex flex-wrap items-center gap-2"
			>
				<input
					type="file"
					name="plan"
					accept="image/png,image/jpeg,image/webp,image/svg+xml"
					class="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-semibold file:text-surface"
				/>
				<Button type="submit" size="sm" variant="secondary"
					>{i18n.t('admin.places.uploadPlan')}</Button
				>
			</form>
			{#if data.sitePlanAssetId}
				<form method="POST" action="?/plan" use:enhance>
					<input type="hidden" name="remove" value="on" />
					<Button type="submit" size="sm" variant="ghost"
						>{i18n.t('admin.places.removePlan')}</Button
					>
				</form>
			{/if}
		</section>

		<section aria-labelledby="desk" class="space-y-3">
			<h2 id="desk" class="border-b-2 border-ink pb-1 text-sm font-bold">
				{i18n.t('admin.places.desk')}
			</h2>
			<p class="text-sm text-ink-muted">{i18n.t('admin.places.deskHint')}</p>
			{#if result?.action === 'desk'}<FormMessage
					error={result.error}
					success={result.success}
				/>{/if}
			<form method="POST" action="?/desk" use:enhance class="flex gap-2">
				<label class="sr-only" for="deskPlace">{i18n.t('admin.places.desk')}</label>
				<select
					id="deskPlace"
					name="placeId"
					class="h-10 min-w-0 flex-1 text-sm"
					value={data.deskPlaceId ?? ''}
				>
					<option value="">{i18n.t('admin.places.deskNone')}</option>
					{#each data.places as p (p.id)}<option value={p.id}
							>{localized(p, 'name', i18n.locale)}</option
						>{/each}
				</select>
				<Button type="submit" size="sm" variant="secondary">{i18n.t('common.save')}</Button>
			</form>
		</section>
	</aside>
</div>
