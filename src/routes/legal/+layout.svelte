<script lang="ts">
	import BrandMark from '#lib/components/BrandMark.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import LocaleSwitch from '#lib/components/LocaleSwitch.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="flex min-h-dvh flex-col">
	<header
		class="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6"
	>
		<BrandMark />
		<LocaleSwitch />
	</header>
	<main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
		{@render children()}
	</main>
	<Footer />
</div>
