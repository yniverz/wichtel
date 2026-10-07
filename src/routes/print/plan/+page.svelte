<script lang="ts">
	import { page } from '$app/state';
	import PrintShift from '#lib/components/print/PrintShift.svelte';
	import { groupBy } from '#lib/grouping.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDayLong } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
	const days = $derived(groupBy(data.shifts, (s) => s.day));
</script>

<svelte:head
	><title>{i18n.t('print.planTitle')} · {page.data.settings.festivalName}</title></svelte:head
>

<header class="mb-6">
	<p class="text-sm">{page.data.settings.festivalName} · {data.editionName}</p>
	<h1 class="font-display text-4xl uppercase">
		{i18n.t('print.planTitle')}{data.areaName ? ` · ${data.areaName}` : ''}
	</h1>
</header>

{#if data.shifts.length === 0}
	<p>{i18n.t('admin.shifts.empty')}</p>
{/if}

{#each days as [day, list], i (day)}
	<!-- Every day starts on a new sheet. -->
	<section class={i > 0 ? 'break-before-page pt-2' : ''}>
		<h2 class="font-display mb-3 text-2xl uppercase">{formatDayLong(day, i18n.locale)}</h2>
		{#each list as shift (shift.id)}
			<PrintShift {shift} timezone={data.timezone} />
		{/each}
	</section>
{/each}
