<script lang="ts">
	import { getI18n } from '#lib/i18n/context.ts';
	import Button from '#lib/components/Button.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	const i18n = getI18n();
</script>

<!-- Paper look on screen as well, regardless of dark mode. -->
<div class="min-h-dvh bg-white text-neutral-950 print:min-h-0">
	<div
		class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-300 bg-white px-6 py-3 print:hidden"
	>
		<button
			type="button"
			class="text-sm font-semibold text-neutral-700 hover:underline"
			onclick={() => history.back()}>← {i18n.t('common.back')}</button
		>
		<Button onclick={() => window.print()}>{i18n.t('print.print')}</Button>
	</div>
	<main class="mx-auto max-w-[190mm] px-6 py-8 print:max-w-none print:p-0">
		{@render children()}
	</main>
</div>

<style>
	@page {
		size: A4;
		margin: 14mm 12mm;
	}
</style>
