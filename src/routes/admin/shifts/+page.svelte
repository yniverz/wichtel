<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import SpotMeter from '#lib/components/SpotMeter.svelte';
	import { groupBy } from '#lib/grouping.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDayLong, formatTime, localized } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
	const tz = $derived(data.timezone);
	const grouped = $derived(groupBy(data.shifts, (s) => s.day));
	const totals = (s: (typeof data.shifts)[number]) => ({
		booked: s.positions.reduce((n, p) => n + p.booked, 0),
		capacity: s.positions.reduce((n, p) => n + p.capacity, 0)
	});
</script>

<svelte:head
	><title>{i18n.t('admin.shifts.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.shifts.title')} lead={i18n.t('admin.shifts.lead')}>
	{#snippet actions()}
		{#if data.canCreate}
			<Button href="/admin/shifts/series" variant="secondary"
				>{i18n.t('admin.shifts.series')}</Button
			>
			<Button href="/admin/shifts/new{data.filterArea ? `?area=${data.filterArea}` : ''}"
				>{i18n.t('admin.shifts.new')}</Button
			>
		{/if}
	{/snippet}
</PageHeader>

{#if data.created}
	<div class="mb-6">
		<Alert tone="success">{i18n.t('admin.shifts.series.created', { count: data.created })}</Alert>
	</div>
{/if}

{#if data.areaOptions.length > 1}
	<div class="mb-6 max-w-sm">
		<label for="area" class="sr-only">{i18n.t('admin.shifts.area')}</label>
		<select
			id="area"
			class="block h-10 w-full text-sm"
			value={data.filterArea}
			onchange={(e) =>
				goto(e.currentTarget.value ? `?area=${e.currentTarget.value}` : '?', { reset: false })}
		>
			<option value="">{i18n.t('admin.shifts.allAreas')}</option>
			{#each data.areaOptions as a (a.id)}
				<option value={a.id}
					>{'  '.repeat(a.depth)}{a.depth ? '└ ' : ''}{localized(a, 'name', i18n.locale)}</option
				>
			{/each}
		</select>
	</div>
{/if}

{#if data.shifts.length === 0}
	<p class="text-ink-muted">{i18n.t('admin.shifts.empty')}</p>
{/if}

{#each grouped as [day, list] (day)}
	<section class="mb-8">
		<h2 class="font-display border-b-2 border-ink pb-1 text-2xl uppercase">
			{formatDayLong(day, i18n.locale)}
		</h2>
		<ul>
			{#each list as shift (shift.id)}
				{@const t = totals(shift)}
				<li class="border-b border-line">
					<a
						href="/admin/shifts/{shift.id}"
						class="grid grid-cols-[5.5rem_1fr] gap-3 py-3 hover:bg-ink/3 sm:grid-cols-[5.5rem_1fr_auto]"
					>
						<span class="text-sm font-bold tabular-nums">
							{formatTime(shift.startsAt, i18n.locale, tz)}–{formatTime(
								shift.endsAt,
								i18n.locale,
								tz
							)}
						</span>
						<span class="min-w-0">
							<span class="font-bold">{localized(shift, 'title', i18n.locale)}</span>
							{#if shift.internal}<span class="ml-1 text-xs text-ink-muted"
									>({i18n.t('shifts.internal')})</span
								>{/if}
							<span class="block text-sm text-ink-muted"
								>{shift.area ? localized(shift.area, 'name', i18n.locale) : ''}</span
							>
						</span>
						<span
							class="col-start-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:col-start-3 sm:justify-end"
						>
							{#each shift.positions as p (p.id)}
								<span
									class="inline-flex items-center gap-1.5 tabular-nums"
									title={localized(p, 'name', i18n.locale)}
								>
									<SpotMeter capacity={p.capacity} taken={p.booked} />
									{p.booked}/{p.capacity}
								</span>
							{/each}
							{#if shift.requested}<Badge tone="warning"
									>{i18n.t('admin.shifts.requests', { count: shift.requested })}</Badge
								>{/if}
							{#if t.booked < t.capacity}<span class="sr-only">{t.capacity - t.booked}</span>{/if}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/each}
