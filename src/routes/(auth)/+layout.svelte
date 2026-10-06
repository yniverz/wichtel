<script lang="ts">
	import { page } from '$app/state';
	import BrandMark from '#lib/components/BrandMark.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import LocaleSwitch from '#lib/components/LocaleSwitch.svelte';
	import { assetUrl } from '#lib/assets.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized } from '#lib/i18n/index.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	const i18n = getI18n();
	const settings = $derived(page.data.settings);
	const tagline = $derived(localized(settings, 'tagline', i18n.locale));
</script>

<div class="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
	<!-- Brand panel (desktop) -->
	<aside
		class="relative hidden overflow-hidden bg-brand text-brand-fg lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-end lg:p-12"
	>
		{#if settings.backgroundAssetId}
			<img
				src={assetUrl(settings.backgroundAssetId)}
				alt=""
				class="absolute inset-0 size-full object-cover"
			/>
			<div
				class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
			></div>
		{/if}
		<div class="relative {settings.backgroundAssetId ? 'text-white' : ''}">
			<a href="/" class="font-display block text-[clamp(3rem,6vw,6rem)] break-words uppercase"
				>{settings.festivalName}</a
			>
			{#if tagline}<p class="mt-4 max-w-md text-lg font-semibold">{tagline}</p>{/if}
		</div>
	</aside>

	<div class="flex min-h-dvh flex-col">
		<header class="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
			<span class="lg:invisible"><BrandMark /></span>
			<LocaleSwitch />
		</header>
		<main class="flex flex-1 justify-center px-4 py-8 sm:px-8 lg:items-center">
			<div class="w-full max-w-md">
				{@render children()}
			</div>
		</main>
		<Footer />
	</div>
</div>
