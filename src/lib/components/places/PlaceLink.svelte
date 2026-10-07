<script lang="ts">
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized } from '#lib/i18n/index.ts';
	import PlaceDetails, { type PlaceInfo } from './PlaceDetails.svelte';

	/** A place name that opens its details (plan, map, navigation) in a dialog. */
	let { place, sitePlanAssetId = null }: { place: PlaceInfo; sitePlanAssetId?: string | null } =
		$props();
	const i18n = getI18n();
	let dialog: HTMLDialogElement | undefined = $state();
	let opened = $state(false);
</script>

<button
	type="button"
	class="inline-flex items-center gap-1 font-semibold text-brand-text underline decoration-dotted underline-offset-4 hover:decoration-solid"
	onclick={() => {
		opened = true;
		dialog?.showModal();
	}}
>
	<svg
		viewBox="0 0 24 24"
		class="size-4 shrink-0"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		aria-hidden="true"
		><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z" /><circle
			cx="12"
			cy="10"
			r="2.5"
		/></svg
	>
	{localized(place, 'name', i18n.locale)}
</button>

<dialog
	bind:this={dialog}
	class="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-lg border border-ink/20 bg-surface-raised p-0 text-ink shadow-[0_20px_60px_-20px_rgb(0_0_0/0.45)] backdrop:bg-ink/50"
	onclose={() => (opened = false)}
>
	<div class="space-y-4 p-5">
		{#if opened}<PlaceDetails {place} {sitePlanAssetId} />{/if}
		<form method="dialog" class="flex justify-end">
			<button class="rounded-md border border-ink/25 px-4 py-2 text-sm font-semibold"
				>{i18n.t('common.close')}</button
			>
		</form>
	</div>
</dialog>
