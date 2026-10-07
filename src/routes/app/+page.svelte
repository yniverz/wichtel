<script lang="ts">
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import PlaceDetails from '#lib/components/places/PlaceDetails.svelte';
	import { formatDateRange, formatDayShort, formatTime, localized } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head><title>{i18n.t('nav.home')} · {page.data.settings.festivalName}</title></svelte:head>

<div class="space-y-10">
	<header class="border-b border-ink pb-4">
		<h1 class="font-display text-5xl uppercase sm:text-6xl">
			{i18n.t('app.home.greeting', { name: page.data.user?.firstName ?? '' })}
		</h1>
		{#if data.edition}
			<p class="mt-2 text-ink-muted">
				{data.edition.name} ·
				<span class="tabular-nums"
					>{formatDateRange(data.edition.startsOn, data.edition.endsOn, i18n.locale)}</span
				>
			</p>
		{/if}
	</header>

	{#if data.missingFields}
		<Alert tone="warning">
			<a href="/app/profile" class="font-semibold underline">{i18n.t('app.home.missingFields')}</a>
		</Alert>
	{/if}

	{#if !data.edition}
		<p class="text-lg text-ink-muted">{i18n.t('app.home.noEdition')}</p>
	{:else}
		<div class="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
			<section>
				<h2 class="border-b border-line pb-2 text-sm font-bold">
					{i18n.t('app.home.shifts.title')}
				</h2>
				{#if data.mine.length === 0}
					<p class="mt-4 max-w-prose text-ink-muted">{i18n.t('app.home.shifts.none')}</p>
					<div class="mt-4">
						<Button href="/app/shifts">{i18n.t('app.home.shifts.browse')}</Button>
					</div>
				{:else}
					<ul>
						{#each data.mine as shift (shift.id)}
							<li class="border-b border-line">
								<a
									href="/app/shifts"
									class="grid grid-cols-[5.5rem_1fr_auto] items-start gap-3 py-3"
								>
									<span class="text-sm leading-tight font-bold tabular-nums">
										{formatDayShort(shift.day, i18n.locale)}<br />
										<span class="font-normal text-ink-muted"
											>{formatTime(shift.startsAt, i18n.locale, data.timezone)}–{formatTime(
												shift.endsAt,
												i18n.locale,
												data.timezone
											)}</span
										>
									</span>
									<span class="min-w-0">
										<span class="block font-bold">{localized(shift, 'title', i18n.locale)}</span>
										<span class="block truncate text-sm text-ink-muted"
											>{shift.meetingPoint ||
												shift.location ||
												shift.areaPath
													.map((a) => localized(a, 'name', i18n.locale))
													.join(' › ')}</span
										>
									</span>
									{#if shift.mine?.status === 'requested'}<Badge tone="warning"
											>{i18n.t('shifts.status.requested')}</Badge
										>{/if}
								</a>
							</li>
						{/each}
					</ul>
					<a
						href="/app/shifts"
						class="mt-3 inline-block text-sm font-semibold text-brand-text hover:underline"
						>{i18n.t('app.home.shifts.more')} →</a
					>
				{/if}
			</section>
			<section>
				<h2 class="border-b border-line pb-2 text-sm font-bold">
					{i18n.t('app.home.points.title')}
				</h2>
				<p class="font-display mt-3 text-7xl text-brand-text tabular-nums">0</p>
				<p class="mt-2 text-sm text-ink-muted">{i18n.t('app.home.points.text')}</p>
			</section>
		</div>
	{/if}

	{#if data.desk}
		<section aria-labelledby="desk" class="max-w-2xl">
			<h2 id="desk" class="border-b border-line pb-2 text-sm font-bold">
				{i18n.t('app.home.desk')}
			</h2>
			<div class="mt-4">
				<PlaceDetails place={data.desk} sitePlanAssetId={data.sitePlanAssetId} />
			</div>
		</section>
	{/if}

	<section class="divide-y divide-line border-y border-line">
		{#if data.canAdmin}
			<div class="flex flex-wrap items-center justify-between gap-3 py-4">
				<p>{i18n.t('app.home.admin')}</p>
				<Button href="/admin" size="sm" variant="secondary">{i18n.t('app.home.adminLink')} →</Button
				>
			</div>
		{/if}
		<div class="flex flex-wrap items-center justify-between gap-3 py-4">
			<p>{i18n.t('app.home.profileHint')}</p>
			<Button href="/app/profile" size="sm" variant="secondary">{i18n.t('nav.profile')} →</Button>
		</div>
	</section>
</div>
