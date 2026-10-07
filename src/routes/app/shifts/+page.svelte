<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import SpotMeter from '#lib/components/SpotMeter.svelte';
	import PlaceLink from '#lib/components/places/PlaceLink.svelte';
	import Toast from '#lib/components/Toast.svelte';
	import { groupBy } from '#lib/grouping.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import {
		formatDateTime,
		formatDayLong,
		formatDayShort,
		formatTime,
		formatPoints,
		localized
	} from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const tz = $derived(data.timezone);

	// Filters (client-side: instant, no reloads)
	let day = $state<string | null>(null);
	let area = $state<string>('');
	let onlyFree = $state(false);
	let onlyMine = $state(false);
	let open = $state<string | null>(null);

	const days = $derived([...new Set(data.shifts.map((s) => s.day))].sort());
	const rootAreas = $derived(
		groupBy(
			data.shifts.filter((s) => s.areaPath[0]),
			(s) => s.areaRootId
		)
			.map(([id, list]) => ({ id, label: localized(list[0].areaPath[0], 'name', i18n.locale) }))
			.sort((a, b) => a.label.localeCompare(b.label))
	);

	const hasFree = (s: (typeof data.shifts)[number]) => s.positions.some((p) => p.free > 0);
	const filtered = $derived(
		data.shifts.filter(
			(s) =>
				(!day || s.day === day) &&
				(!area || s.areaRootId === area) &&
				(!onlyFree || (hasFree(s) && !s.past)) &&
				(!onlyMine || s.mine)
		)
	);
	const grouped = $derived(groupBy(filtered, (s) => s.day));
	const countFor = (d: string) => data.shifts.filter((s) => s.day === d).length;
	const hours = (s: { startsAt: string; endsAt: string }) =>
		Math.round(((Date.parse(s.endsAt) - Date.parse(s.startsAt)) / 3_600_000) * 10) / 10;

	type Result = { success?: string; error?: string };
	const result = $derived(form as Result | null);
	let pendingPosition = $state<string | null>(null);

	const cancelLabel = (status: string) =>
		status === 'requested'
			? i18n.t('shifts.withdraw')
			: status === 'waitlisted'
				? i18n.t('shifts.waitlist.leave')
				: i18n.t('shifts.cancel');

	// If booking is closed for every shift, say so once at the top.
	const closedBanner = $derived.by(() => {
		const upcoming = data.shifts.filter((s) => !s.past);
		if (upcoming.length === 0 || upcoming.some((s) => s.bookingOpen)) return null;
		const next = upcoming
			.map((s) => s.bookingOpensAt)
			.filter((d): d is string => d !== null)
			.sort()[0];
		return next
			? i18n.t('shifts.banner.opens', { date: formatDateTime(new Date(next), i18n.locale, tz) })
			: i18n.t('shifts.banner.closed');
	});

	const invited = $derived(page.url.searchParams.get('invited'));

	function resetFilters() {
		day = null;
		area = '';
		onlyFree = false;
		onlyMine = false;
	}
</script>

<svelte:head
	><title>{i18n.t('shifts.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<header class="border-b border-ink pb-4">
	<h1 class="font-display text-5xl uppercase sm:text-6xl">{i18n.t('shifts.title')}</h1>
	<p class="mt-2 text-ink-muted">{i18n.t('shifts.lead')}</p>
</header>

{#if data.shifts.length === 0}
	<p class="mt-8 text-lg text-ink-muted">{i18n.t('shifts.emptyAll')}</p>
{:else}
	{#if closedBanner}
		<div class="mt-6"><Alert tone="info">{closedBanner}</Alert></div>
	{/if}
	<!-- Filters -->
	<div class="sticky top-14 z-20 -mx-4 border-b border-line bg-surface px-4 pt-3 pb-3">
		<div
			class="-mx-4 flex scrollbar-none gap-1 overflow-x-auto px-4 pb-2"
			role="tablist"
			aria-label={i18n.t('admin.shifts.date')}
		>
			<button
				role="tab"
				aria-selected={day === null}
				class="shrink-0 rounded-md px-3 py-2 text-sm font-semibold {day === null
					? 'bg-ink text-surface'
					: 'text-ink-muted hover:text-ink'}"
				onclick={() => (day = null)}>{i18n.t('shifts.filter.allDays')}</button
			>
			{#each days as d (d)}
				<button
					role="tab"
					aria-selected={day === d}
					class="shrink-0 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap tabular-nums {day ===
					d
						? 'bg-ink text-surface'
						: 'text-ink-muted hover:text-ink'}"
					onclick={() => (day = d)}
					>{formatDayShort(d, i18n.locale)}
					<span class="ml-0.5 text-xs font-normal opacity-60">{countFor(d)}</span></button
				>
			{/each}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#if rootAreas.length > 1}
				<label class="sr-only" for="area-filter">{i18n.t('shifts.filter.area')}</label>
				<select
					id="area-filter"
					bind:value={area}
					class="h-9 min-w-0 flex-1 py-0 text-sm sm:max-w-56 sm:flex-none"
				>
					<option value="">{i18n.t('shifts.filter.allAreas')}</option>
					{#each rootAreas as a (a.id)}<option value={a.id}>{a.label}</option>{/each}
				</select>
			{/if}
			{#each [{ key: 'free', label: 'shifts.filter.free' }, { key: 'mine', label: 'shifts.filter.mine' }] as const as chip (chip.key)}
				{@const active = chip.key === 'free' ? onlyFree : onlyMine}
				<button
					class="h-9 rounded-md border px-3 text-sm font-semibold {active
						? 'border-ink bg-ink text-surface'
						: 'border-ink/25 text-ink'}"
					aria-pressed={active}
					onclick={() => (chip.key === 'free' ? (onlyFree = !onlyFree) : (onlyMine = !onlyMine))}
					>{i18n.t(chip.label)}</button
				>
			{/each}
		</div>
	</div>

	{#if filtered.length === 0}
		<div class="mt-8 space-y-4">
			<p class="text-ink-muted">{i18n.t('shifts.empty')}</p>
			<Button variant="secondary" size="sm" onclick={resetFilters}
				>{i18n.t('shifts.resetFilters')}</Button
			>
		</div>
	{/if}

	{#each grouped as [groupDay, list] (groupDay)}
		<section class="mt-8" aria-labelledby="day-{groupDay}">
			<h2 id="day-{groupDay}" class="font-display border-b-2 border-ink pb-1 text-2xl uppercase">
				{formatDayLong(groupDay, i18n.locale)}
			</h2>
			<ul>
				{#each list as shift (shift.id)}
					{@const expanded = open === shift.id}
					{@const free = shift.positions.reduce((n, p) => n + p.free, 0)}
					<li class="border-b border-line {shift.past ? 'opacity-55' : ''}">
						<button
							class="grid w-full grid-cols-[4.75rem_1fr_auto] items-start gap-3 py-3.5 text-left"
							aria-expanded={expanded}
							aria-controls="shift-{shift.id}"
							onclick={() => (open = expanded ? null : shift.id)}
						>
							<span class="pt-0.5 text-sm leading-tight font-bold tabular-nums">
								{formatTime(shift.startsAt, i18n.locale, tz)}<br />
								<span class="font-normal text-ink-muted"
									>{formatTime(shift.endsAt, i18n.locale, tz)}</span
								>
							</span>
							<span class="min-w-0">
								<span class="block font-bold">{localized(shift, 'title', i18n.locale)}</span>
								<span class="block truncate text-sm text-ink-muted">
									{shift.areaPath.map((a) => localized(a, 'name', i18n.locale)).join(' › ')}
									{#if shift.internal}· {i18n.t('shifts.internal')}{/if}
								</span>
							</span>
							<span class="flex flex-col items-end gap-1 pt-0.5">
								{#if shift.mine}
									<Badge
										tone={shift.mine.status === 'booked'
											? 'brand'
											: shift.mine.status === 'requested' || shift.mine.status === 'waitlisted'
												? 'warning'
												: 'neutral'}
									>
										{i18n.t(`shifts.status.${shift.mine.status}`)}
									</Badge>
								{:else if free === 0}
									<span class="text-sm text-ink-muted">{i18n.t('shifts.full')}</span>
								{:else}
									<span class="text-sm font-semibold tabular-nums"
										>{i18n.t('shifts.free', { free })}</span
									>
								{/if}
							</span>
						</button>

						{#if expanded}
							<div id="shift-{shift.id}" class="mb-4 ml-0 space-y-4 sm:ml-[5.5rem]">
								{#if localized(shift, 'description', i18n.locale)}
									<p class="whitespace-pre-line">{localized(shift, 'description', i18n.locale)}</p>
								{/if}
								<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
									<dt class="text-ink-muted">{i18n.t('admin.shifts.date')}</dt>
									<dd class="tabular-nums">
										{formatDayShort(shift.day, i18n.locale)}, {formatTime(
											shift.startsAt,
											i18n.locale,
											tz
										)}–{formatTime(shift.endsAt, i18n.locale, tz)}
										· {i18n.t('shifts.duration', {
											hours: hours(shift).toLocaleString(i18n.locale)
										})}
									</dd>
									{#if shift.location || shift.locationPlace}
										<dt class="text-ink-muted">{i18n.t('shifts.location')}</dt>
										<dd>
											{#if shift.locationPlace}<PlaceLink
													place={shift.locationPlace}
													sitePlanAssetId={data.sitePlanAssetId}
												/>{/if}
											{#if shift.location}<span class={shift.locationPlace ? 'text-ink-muted' : ''}
													>{shift.locationPlace ? `· ${shift.location}` : shift.location}</span
												>{/if}
										</dd>
									{/if}
									{#if shift.meetingPoint || shift.meetingPlace}
										<dt class="text-ink-muted">{i18n.t('shifts.meetingPoint')}</dt>
										<dd>
											{#if shift.meetingPlace}<PlaceLink
													place={shift.meetingPlace}
													sitePlanAssetId={data.sitePlanAssetId}
												/>{/if}
											{#if shift.meetingPoint}<span
													class={shift.meetingPlace ? 'text-ink-muted' : ''}
													>{shift.meetingPlace
														? `· ${shift.meetingPoint}`
														: shift.meetingPoint}</span
												>{/if}
										</dd>
									{/if}
									{#if shift.contact}<dt class="text-ink-muted">{i18n.t('shifts.contact')}</dt>
										<dd>{shift.contact}</dd>{/if}
								</dl>

								<ul class="divide-y divide-line border-y border-line">
									{#each shift.positions as position (position.id)}
										{@const isMine = shift.mine?.positionId === position.id}
										<li class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
											<div class="min-w-0">
												<p class="font-semibold">{localized(position, 'name', i18n.locale)}</p>
												{#if localized(position, 'description', i18n.locale)}
													<p class="text-sm text-ink-muted">
														{localized(position, 'description', i18n.locale)}
													</p>
												{/if}
												<p class="mt-1 flex items-center gap-2 text-sm text-ink-muted tabular-nums">
													<SpotMeter
														capacity={position.capacity}
														taken={position.capacity - position.free}
													/>
													{position.free > 0
														? i18n.t('shifts.free', { free: position.free })
														: i18n.t('shifts.full')}
													· {formatPoints(position.points, i18n.t)}
													{#if position.mode === 'request'}· {i18n.t(
															'admin.shifts.mode.request'
														)}{/if}
												</p>
												{#if position.required.length}
													<p class="mt-1 text-sm">
														{i18n.t('shifts.requires', {
															names: position.required
																.map(
																	(q) => `${localized(q, 'name', i18n.locale)}${q.held ? ' ✓' : ''}`
																)
																.join(', ')
														})}
													</p>
												{/if}
												{#if position.preferred.length}
													<p class="text-sm text-ink-muted">
														{i18n.t('shifts.preferred', {
															names: position.preferred
																.map((q) => localized(q, 'name', i18n.locale))
																.join(', ')
														})}
													</p>
												{/if}
											</div>

											{#if isMine && shift.mine}
												<div class="flex flex-col items-end gap-1">
													{#if shift.mine.canCancel}
														<ConfirmForm
															action="?/cancel"
															hidden={{ assignmentId: shift.mine.assignmentId }}
															variant="secondary"
															message={i18n.t('shifts.cancelConfirm')}
															confirmLabel={cancelLabel(shift.mine.status)}
														>
															{cancelLabel(shift.mine.status)}
														</ConfirmForm>
													{/if}
													{#if shift.mine.status === 'waitlisted' && shift.mine.waitlistPlace}
														<p class="text-xs text-ink-muted">
															{i18n.t('shifts.waitlist.place', { place: shift.mine.waitlistPlace })}
														</p>
													{/if}
													{#if shift.mine.status === 'booked'}
														<p class="text-xs text-ink-muted">
															{shift.mine.canCancel && shift.mine.cancelUntil
																? i18n.t('shifts.cancelUntil', {
																		date: formatDateTime(
																			new Date(shift.mine.cancelUntil),
																			i18n.locale,
																			tz
																		)
																	})
																: i18n.t('shifts.cancelClosed')}
														</p>
													{/if}
												</div>
											{:else if !shift.mine && !shift.past}
												{#if !shift.bookingOpen}
													<p class="max-w-48 text-right text-xs text-ink-muted">
														{shift.bookingOpensAt
															? i18n.t('shifts.bookingOpens', {
																	date: formatDateTime(
																		new Date(shift.bookingOpensAt),
																		i18n.locale,
																		tz
																	)
																})
															: i18n.t('shifts.bookingClosed')}
													</p>
												{:else if shift.conflict}
													<p class="max-w-48 text-right text-xs text-ink-muted">
														{i18n.t('shifts.conflict')}
													</p>
												{:else if position.free > 0 && position.required.some((q) => !q.held)}
													<Button
														href="/app/qualifications?q={position.required.find((q) => !q.held)
															?.id}#{position.required.find((q) => !q.held)?.id}"
														variant="secondary">{i18n.t('shifts.getQualified')}</Button
													>
												{:else if position.free > 0}
													<form
														method="POST"
														action="?/book"
														use:enhance={() => {
															pendingPosition = position.id;
															return async ({ update }) => {
																await update({ reset: false });
																pendingPosition = null;
															};
														}}
													>
														<input type="hidden" name="positionId" value={position.id} />
														<Button type="submit" loading={pendingPosition === position.id}>
															{position.mode === 'request'
																? i18n.t('shifts.request')
																: i18n.t('shifts.book')}
														</Button>
													</form>
												{:else if shift.waitlistEnabled && !position.required.some((q) => !q.held)}
													<form
														method="POST"
														action="?/waitlist"
														use:enhance
														class="flex flex-col items-end gap-1"
													>
														<input type="hidden" name="positionId" value={position.id} />
														<Button type="submit" variant="secondary"
															>{i18n.t('shifts.waitlist.join')}</Button
														>
														{#if position.waitlisted}
															<span class="text-xs text-ink-muted"
																>{i18n.t('shifts.waitlist.count', {
																	count: position.waitlisted
																})}</span
															>
														{/if}
													</form>
												{/if}
											{/if}
										</li>
									{/each}
								</ul>
								{#if !shift.mine && shift.positions.some((p) => p.mode === 'request')}
									<p class="text-xs text-ink-muted">{i18n.t('shifts.requestHint')}</p>
								{/if}
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/each}
{/if}

<Toast
	message={result?.error ??
		result?.success ??
		(invited ? i18n.t('invite.success', { wave: invited }) : null)}
	tone={result?.error ? 'error' : 'success'}
	token={form}
/>
