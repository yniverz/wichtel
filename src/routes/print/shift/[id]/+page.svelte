<script lang="ts">
	import { page } from '$app/state';
	import PrintShift from '#lib/components/print/PrintShift.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head
	><title>{localized(data.shift, 'title', i18n.locale)} · {page.data.settings.festivalName}</title
	></svelte:head
>

<header class="mb-6">
	<p class="text-sm">{page.data.settings.festivalName} · {data.editionName}</p>
	<h1 class="font-display text-4xl uppercase">{i18n.t('print.crewTitle')}</h1>
</header>
<PrintShift shift={data.shift} timezone={data.timezone} />
