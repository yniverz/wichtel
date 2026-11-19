<script lang="ts">
	import { page } from '$app/state';
	import BrandMark from '#lib/components/BrandMark.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import HelpLink from '#lib/components/HelpLink.svelte';
	import LocaleSwitch from '#lib/components/LocaleSwitch.svelte';
	import PageBackground from '#lib/components/PageBackground.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized } from '#lib/i18n/index.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	const i18n = getI18n();
	const settings = $derived(page.data.settings);
	const tagline = $derived(localized(settings, 'tagline', i18n.locale));
	const hasBackground = $derived(!!settings.backgroundAssetId);
</script>

<PageBackground assetId={settings.backgroundAssetId} />

<div class="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
	<!-- Brand panel (desktop) -->
	<aside
		class="relative hidden overflow-hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-end lg:p-12 {hasBackground
			? ''
			: 'bg-brand text-brand-fg'}"
	>
		{#if hasBackground}
			<!-- The page background shows through here; the gradient keeps the name legible. -->
			<div
				class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
			></div>
		{/if}
		<div class="relative {hasBackground ? 'text-white' : ''}">
			<a href="/" class="font-display block text-[clamp(3rem,6vw,6rem)] break-words uppercase"
				>{settings.festivalName}</a
			>
			{#if tagline}<p class="mt-4 max-w-md text-lg font-semibold">{tagline}</p>{/if}
		</div>
	</aside>

	<div class="flex min-h-dvh flex-col {hasBackground ? 'bg-surface/90 backdrop-blur-sm' : ''}">
		<header class="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
			<span class="lg:invisible"><BrandMark /></span>
			<div class="flex items-center gap-2">
				<HelpLink />
				<LocaleSwitch />
			</div>
		</header>
		<main class="flex flex-1 justify-center px-4 py-8 sm:px-8 lg:items-center">
			<div class="w-full max-w-md">
				{@render children()}
			</div>
		</main>
		<Footer />
	</div>
</div>
