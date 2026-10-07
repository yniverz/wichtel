<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Badge from '#lib/components/Badge.svelte';
	import Card from '#lib/components/Card.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDayShort, formatTime, localized, type MessageKey } from '#lib/i18n/index.ts';
	import { utcToZoned } from '#lib/domain/time.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
	const tz = $derived(data.timezone);

	// Live: refresh every minute while the tab is visible.
	$effect(() => {
		const timer = setInterval(() => {
			if (document.visibilityState === 'visible') invalidateAll();
		}, 60_000);
		return () => clearInterval(timer);
	});

	const steps = $derived(
		(
			[
				{
					done: data.steps.branding,
					label: 'admin.overview.step.branding',
					href: '/admin/settings',
					show: page.data.access.isAdmin
				},
				{
					done: data.steps.areas,
					label: 'admin.overview.step.areas',
					href: '/admin/areas',
					show: page.data.access.areas
				},
				{
					done: data.steps.roles,
					label: 'admin.overview.step.roles',
					href: '/admin/people',
					show: page.data.access.people
				}
			] satisfies { done: boolean; label: MessageKey; href: string; show: boolean }[]
		).filter((s) => s.show)
	);
	const setupDone = $derived(steps.every((s) => s.done));

	const d = $derived(data.dashboard);
	const percent = (booked: number, capacity: number) =>
		capacity === 0 ? 0 : Math.round((booked / capacity) * 100);
	const day = (iso: string) => formatDayShort(utcToZoned(new Date(iso), tz).date, i18n.locale);
	const range = (s: { startsAt: string; endsAt: string }) =>
		`${formatTime(s.startsAt, i18n.locale, tz)}–${formatTime(s.endsAt, i18n.locale, tz)}`;
	/** Cell shading: the emptier, the more it stands out. */
	const cellClass = (fill: number) =>
		fill >= 100
			? 'bg-ink/10 text-ink-muted'
			: fill >= 75
				? 'bg-accent/30'
				: fill >= 40
					? 'bg-accent/70 text-accent-fg'
					: 'bg-brand text-brand-fg';
</script>

<svelte:head><title>{i18n.t('admin.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader
	title={i18n.t('admin.title')}
	lead={i18n.t('admin.overview.lead', { festival: page.data.settings.festivalName })}
/>

<div class="space-y-12">
	{#if !setupDone && steps.length}
		<Card title={i18n.t('admin.overview.nextSteps')}>
			<ul class="divide-y divide-line">
				{#each steps as step (step.href)}
					<li>
						<a href={step.href} class="flex items-center gap-3 py-3 hover:underline">
							<span
								class="grid size-5 shrink-0 place-items-center rounded-sm text-xs font-bold {step.done
									? 'bg-ink text-surface'
									: 'border-2 border-ink/30'}"
								aria-hidden="true">{step.done ? '✓' : ''}</span
							>
							<span class={step.done ? 'text-ink-muted line-through' : ''}
								>{i18n.t(step.label)}</span
							>
							<span class="ml-auto text-ink-muted" aria-hidden="true">→</span>
						</a>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}

	{#if d}
		<dl class="flex flex-wrap gap-x-12 gap-y-6">
			<div>
				<dt class="text-sm text-ink-muted">{i18n.t('admin.dash.filled')}</dt>
				<dd class="font-display text-6xl tabular-nums">
					{percent(d.totals.booked, d.totals.capacity)}<span class="text-3xl">%</span>
				</dd>
				<dd class="text-sm text-ink-muted tabular-nums">
					{i18n.t('admin.dash.places', { booked: d.totals.booked, capacity: d.totals.capacity })}
				</dd>
			</div>
			<div>
				<dt class="text-sm text-ink-muted">{i18n.t('admin.dash.people')}</dt>
				<dd class="font-display text-6xl tabular-nums">{d.totals.people}</dd>
				<dd class="text-sm text-ink-muted tabular-nums">
					{i18n.t('admin.dash.shifts', { count: d.totals.shifts })}
				</dd>
			</div>
			{#if data.open.requests || data.open.qualifications}
				<div>
					<dt class="text-sm text-ink-muted">{i18n.t('admin.dash.open')}</dt>
					<dd class="font-display text-6xl text-brand-text tabular-nums">
						{data.open.requests + data.open.qualifications}
					</dd>
					<dd class="flex gap-3 text-sm">
						{#if data.open.requests}<a href="/admin/requests" class="hover:underline"
								>{i18n.t('admin.dash.openRequests', { count: data.open.requests })}</a
							>{/if}
						{#if data.open.qualifications}<a href="/admin/qualifications" class="hover:underline"
								>{i18n.t('admin.dash.openQualifications', {
									count: data.open.qualifications
								})}</a
							>{/if}
					</dd>
				</div>
			{/if}
		</dl>

		{#if d.today.length}
			<section aria-labelledby="today">
				<h2 id="today" class="border-b-2 border-ink pb-1 text-lg font-bold">
					{i18n.t('admin.dash.today')}
				</h2>
				<ul class="divide-y divide-line">
					{#each d.today as s (s.id)}
						<li>
							<a
								href="/admin/shifts/{s.id}"
								class="grid grid-cols-[6.5rem_1fr_auto] items-baseline gap-3 py-2.5 hover:bg-ink/5"
							>
								<span class="text-sm tabular-nums">{range(s)}</span>
								<span class="font-semibold">{localized(s, 'title', i18n.locale)}</span>
								<span class="text-sm tabular-nums"
									>{i18n.t('admin.dash.present', {
										attended: s.attended,
										booked: s.booked
									})}{#if s.noShow}
										<span class="text-brand-text">
											· {i18n.t('admin.dash.noShow', { count: s.noShow })}</span
										>{/if}</span
								>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if d.heatmap.days.length}
			<section aria-labelledby="heatmap">
				<h2 id="heatmap" class="border-b-2 border-ink pb-1 text-lg font-bold">
					{i18n.t('admin.dash.heatmap')}
				</h2>
				<p class="mt-2 text-sm text-ink-muted">{i18n.t('admin.dash.heatmapHint')}</p>
				<div class="-mx-4 mt-4 overflow-x-auto px-4">
					<table class="w-full border-separate border-spacing-1 text-sm tabular-nums">
						<thead>
							<tr>
								<th class="sr-only">{i18n.t('admin.shifts.area')}</th>
								{#each d.heatmap.days as dd (dd)}
									<th class="px-1 pb-1 text-left font-semibold whitespace-nowrap"
										>{formatDayShort(dd, i18n.locale)}</th
									>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each d.heatmap.rows as row (row.areaId)}
								<tr>
									<th
										scope="row"
										class="max-w-40 truncate pr-2 text-left font-semibold whitespace-nowrap"
										>{localized(row, 'name', i18n.locale)}</th
									>
									{#each row.cells as cell, i (i)}
										<td class="min-w-16 p-0">
											{#if cell}
												{@const fill = percent(cell.booked, cell.capacity)}
												<a
													href="/admin/shifts?area={row.areaId}#day-{d.heatmap.days[i]}"
													class="block rounded-sm px-2 py-2 font-semibold {cellClass(fill)}"
													title={i18n.t('admin.dash.places', {
														booked: cell.booked,
														capacity: cell.capacity
													})}>{cell.booked}/{cell.capacity}</a
												>
											{:else}
												<span class="block px-2 py-2 text-ink-muted/50">–</span>
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}

		<section aria-labelledby="understaffed">
			<h2 id="understaffed" class="border-b-2 border-ink pb-1 text-lg font-bold">
				{i18n.t('admin.dash.understaffed')}
			</h2>
			{#if d.understaffed.length === 0}
				<p class="py-3 text-sm text-ink-muted">{i18n.t('admin.dash.allFilled')}</p>
			{:else}
				<ul class="divide-y divide-line">
					{#each d.understaffed as s (s.id)}
						<li>
							<a
								href="/admin/shifts/{s.id}"
								class="grid grid-cols-[6.5rem_1fr_auto] items-baseline gap-3 py-2.5 hover:bg-ink/5"
							>
								<span class="text-sm leading-tight tabular-nums"
									><span class="font-semibold">{day(s.startsAt)}</span><br />{range(s)}</span
								>
								<span class="min-w-0">
									<span class="block font-semibold">{localized(s, 'title', i18n.locale)}</span>
									<span class="block truncate text-sm text-ink-muted"
										>{localized(
											{ nameDe: s.areaNameDe, nameEn: s.areaNameEn },
											'name',
											i18n.locale
										)}</span
									>
								</span>
								<span class="flex items-center gap-2 text-sm font-semibold tabular-nums">
									{#if s.urgent}<Badge tone="urgent">{i18n.t('shifts.urgent')}</Badge>{/if}
									{i18n.t('shifts.free', { free: s.free })}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}

	{#if data.numbers}
		<section aria-labelledby="numbers">
			<h2 id="numbers" class="border-b-2 border-ink pb-1 text-lg font-bold">
				{i18n.t('admin.dash.instance')}
			</h2>
			<dl class="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
				{#each [['admin.dash.accounts', data.numbers.accounts], ['admin.dash.verified', data.numbers.verified], ['admin.dash.newThisWeek', data.numbers.newThisWeek], ['admin.dash.goodiesIssued', data.numbers.goodiesIssued]] as const as [label, value] (label)}
					<div>
						<dt class="text-sm text-ink-muted">{i18n.t(label)}</dt>
						<dd class="font-display text-4xl tabular-nums">{value}</dd>
					</div>
				{/each}
			</dl>
			{#if data.numbers.goodiesSelected}
				<p class="mt-3 text-sm">
					<a href="/admin/goodies" class="hover:underline"
						>{i18n.t('admin.dash.goodiesWaiting', { count: data.numbers.goodiesSelected })} →</a
					>
				</p>
			{/if}
		</section>
	{/if}
</div>
