<script lang="ts">
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDayShort, formatTime, localized } from '#lib/i18n/index.ts';
	import type { PrintShift } from '#lib/print.ts';

	let { shift, timezone }: { shift: PrintShift; timezone: string } = $props();
	const i18n = getI18n();
</script>

<!-- One shift: one block that is not split across pages. -->
<article class="mb-6 break-inside-avoid">
	<header
		class="flex flex-wrap items-baseline justify-between gap-x-4 border-b-2 border-neutral-950 pb-1"
	>
		<h2 class="text-lg font-bold">
			<span class="tabular-nums"
				>{formatDayShort(shift.day, i18n.locale)}
				{formatTime(shift.startsAt, i18n.locale, timezone)}–{formatTime(
					shift.endsAt,
					i18n.locale,
					timezone
				)}</span
			>
			· {localized(shift, 'title', i18n.locale)}
		</h2>
		<p class="text-sm">{shift.areaPath}</p>
	</header>
	{#if shift.where || shift.contact}
		<p class="mt-1 text-sm">
			{#if shift.where}{i18n.t('shifts.meetingPoint')}: {shift.where}{/if}
			{#if shift.where && shift.contact}·{/if}
			{#if shift.contact}{i18n.t('shifts.contact')}: {shift.contact}{/if}
		</p>
	{/if}
	<table class="mt-2 w-full border-collapse text-sm">
		<thead>
			<tr class="border-b border-neutral-400 text-left">
				<th class="w-1/4 py-1 pr-2 font-semibold">{i18n.t('print.position')}</th>
				<th class="py-1 pr-2 font-semibold">{i18n.t('print.name')}</th>
				<th class="w-36 py-1 pr-2 font-semibold">{i18n.t('print.phone')}</th>
				<th class="w-16 py-1 text-center font-semibold">{i18n.t('print.present')}</th>
			</tr>
		</thead>
		<tbody>
			{#each shift.positions as position (position.id)}
				{#each Array.from({ length: Math.max(position.capacity, position.people.length) }, (_, i) => position.people[i]) as person, i (i)}
					<tr class="border-b border-neutral-300">
						<td class="py-1.5 pr-2 align-top"
							>{i === 0 ? localized(position, 'name', i18n.locale) : ''}</td
						>
						<td class="py-1.5 pr-2">
							{#if person}{person.name}{#if person.held}
									<span class="text-neutral-500"> ({i18n.t('admin.shifts.held')})</span>{/if}{/if}
						</td>
						<td class="py-1.5 pr-2 tabular-nums">{person?.phone ?? ''}</td>
						<td class="py-1.5 text-center"
							><span class="inline-block size-4 border border-neutral-950 align-middle"></span></td
						>
					</tr>
				{/each}
			{/each}
		</tbody>
	</table>
</article>
