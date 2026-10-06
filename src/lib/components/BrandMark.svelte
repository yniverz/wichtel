<script lang="ts">
	import { page } from '$app/state';
	import { assetUrl } from '#lib/assets.ts';

	let { href = '/' }: { href?: string } = $props();
	const settings = $derived(page.data.settings);
</script>

{#if settings}
	<a {href} class="inline-flex min-w-0 items-center gap-2.5">
		{#if settings.logoAssetId}
			<img src={assetUrl(settings.logoAssetId)} alt="" class="h-8 w-auto max-w-36 object-contain" />
		{:else}
			<span
				class="font-display grid size-8 shrink-0 place-items-center rounded-sm bg-brand pt-px text-lg text-brand-fg"
				aria-hidden="true">{settings.festivalName.slice(0, 1).toUpperCase()}</span
			>
		{/if}
		<span class="font-display truncate pt-0.5 text-xl uppercase">{settings.festivalName}</span>
	</a>
{/if}
