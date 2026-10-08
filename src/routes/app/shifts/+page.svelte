<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import Field from '#lib/components/Field.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import SpotMeter from '#lib/components/SpotMeter.svelte';
	import PlaceLink from '#lib/components/places/PlaceLink.svelte';
	import Toast from '#lib/components/Toast.svelte';
	import { groupBy } from '#lib/grouping.ts';
	import { ALL_DAYS } from '#lib/domain/shift-days.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import {
		formatDateTime,
		formatDayLong,
		formatDayShort,
		formatTime,
		formatPoints,
		localized,
		type MessageKey
	} from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const tz = $derived(data.timezone);

	// The day comes from the server (`?day=`); the other filters work in the browser.
	const allDays = $derived(data.day === ALL_DAYS);
	// Forms land on the page they were sent from (like a native form), so they keep the day.
	const act = (name: string) => `?day=${data.day}&/${name}`;
	let area = $state<string>('');
	let onlyFree = $state(false);
	let onlyMine = $state(false);
	let onlyMarket = $state(false);
	// A link like /app/shifts?shift=… (e-mails, home page) opens that shift.
	let open = $state<string | null>(page.url.searchParams.get('shift'));
	$effect(() => {
		const target = page.url.searchParams.get('shift');
		if (target) document.getElementById(`row-${target}`)?.scrollIntoView({ block: 'center' });
	});

	const rootAreas = $derived(
		data.areas
			.map((a) => ({ id: a.id, label: localized(a, 'name', i18n.locale) }))
			.sort((a, b) => a.label.localeCompare(b.label))
	);

	const hasFree = (s: (typeof data.shifts)[number]) => s.positions.some((p) => p.free > 0);
	const onMarket = (s: (typeof data.shifts)[number]) =>
		!s.past && !s.mine && s.positions.some((p) => p.marketOfferId);
	const anyMarket = $derived(data.anyMarket);
	const chips = $derived<{ key: 'free' | 'mine' | 'market'; label: MessageKey }[]>([
		{ key: 'free', label: 'shifts.filter.free' },
		{ key: 'mine', label: 'shifts.filter.mine' },
		...(anyMarket ? [{ key: 'market' as const, label: 'shifts.filter.market' as const }] : [])
	]);
	const filtered = $derived(
		data.shifts.filter(
			(s) =>
				(!area || s.areaRootId === area) &&
				(!onlyFree || (hasFree(s) && !s.past)) &&
				(!onlyMine || s.mine) &&
				(!onlyMarket || !anyMarket || onMarket(s))
		)
	);
	const grouped = $derived(groupBy(filtered, (s) => s.day));
	const hours = (s: { startsAt: string; endsAt: string }) =>
		Math.round(((Date.parse(s.endsAt) - Date.parse(s.startsAt)) / 3_600_000) * 10) / 10;

	type Result = {
		success?: string;
		error?: string;
		count?: number;
		action?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
		positionId?: string;
		problems?: { name: string; problem: string }[];
	};
	const result = $derived(form as Result | null);
	let pendingPosition = $state<string | null>(null);

	const cancelLabel = (status: string) =>
		status === 'requested'
			? i18n.t('shifts.withdraw')
			: status === 'waitlisted'
				? i18n.t('shifts.waitlist.leave')
				: i18n.t('shifts.cancel');

	// If booking is closed for every shift, say so once at the top.
	const closedBanner = $derived(
		!data.bookingClosed
			? null
			: data.bookingOpensAt
				? i18n.t('shifts.banner.opens', {
						date: formatDateTime(new Date(data.bookingOpensAt), i18n.locale, tz)
					})
				: i18n.t('shifts.banner.closed')
	);

	const invited = $derived(page.url.searchParams.get('invited'));

	function resetFilters() {
		area = '';
		onlyFree = false;
		onlyMine = false;
		onlyMarket = false;
	}

	// Giving a shift away: one dialog for the whole page.
	let giveAwayDialog: HTMLDialogElement | undefined = $state();
	let giveAwayId = $state<string | null>(null);
	function openGiveAway(assignmentId: string) {
		giveAwayId = assignmentId;
		giveAwayDialog?.showModal();
	}
	$effect(() => {
		if (result?.success === 'shifts.giveAway.offered') giveAwayDialog?.close();
	});

	// Booking together with the group.
	let groupFor = $state<string | null>(null);

	const offerLabel = (offer: { status: string; toName: string | null }) =>
		offer.status === 'pending_approval'
			? i18n.t('shifts.offer.pending')
			: offer.status === 'proposed'
				? i18n.t('shifts.offer.proposed', { name: offer.toName ?? '' })
				: offer.toName
					? i18n.t('shifts.offer.direct', { name: offer.toName })
					: i18n.t('shifts.offer.market');

	const toastMessage = $derived(
		result?.error ??
			(result?.success === 'shifts.group.done'
				? i18n.t('shifts.group.done', { count: result.count ?? 0 })
				: result?.success) ??
			(invited ? i18n.t('invite.success', { wave: invited }) : null)
	);
</script>

<svelte:head
	><title>{i18n.t('shifts.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<header class="border-b border-ink pb-4">
	<h1 class="font-display text-5xl uppercase sm:text-6xl">{i18n.t('shifts.title')}</h1>
	<p class="mt-2 text-ink-muted">{i18n.t('shifts.lead')}</p>
</header>

{#if data.days.length === 0}
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
			<a
				href="?day={ALL_DAYS}"
				role="tab"
				aria-selected={allDays}
				data-sveltekit-noscroll
				class="shrink-0 rounded-md px-3 py-2 text-sm font-semibold {allDays
					? 'bg-ink text-surface'
					: 'text-ink-muted hover:text-ink'}">{i18n.t('shifts.filter.allDays')}</a
			>
			{#each data.days as d (d.day)}
				<a
					href="?day={d.day}"
					role="tab"
					aria-selected={data.day === d.day}
					data-sveltekit-noscroll
					class="shrink-0 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap tabular-nums {data.day ===
					d.day
						? 'bg-ink text-surface'
						: 'text-ink-muted hover:text-ink'}"
					>{formatDayShort(d.day, i18n.locale)}
					<span class="ml-0.5 text-xs font-normal opacity-60">{d.count}</span></a
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
			{#each chips as chip (chip.key)}
				{@const active =
					chip.key === 'free' ? onlyFree : chip.key === 'mine' ? onlyMine : onlyMarket}
				<button
					class="h-9 rounded-md border px-3 text-sm font-semibold {active
						? 'border-ink bg-ink text-surface'
						: 'border-ink/25 text-ink'}"
					aria-pressed={active}
					onclick={() =>
						chip.key === 'free'
							? (onlyFree = !onlyFree)
							: chip.key === 'mine'
								? (onlyMine = !onlyMine)
								: (onlyMarket = !onlyMarket)}>{i18n.t(chip.label)}</button
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
					{@const urgent = !shift.mine && shift.positions.some((p) => p.urgent)}
					<li id="row-{shift.id}" class="border-b border-line {shift.past ? 'opacity-55' : ''}">
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
								{#if shift.buddies.length}
									<span class="block truncate text-sm text-ink-muted"
										>{i18n.t('shifts.withBuddies', { names: shift.buddies.join(', ') })}</span
									>
								{/if}
							</span>
							<span class="flex flex-col items-end gap-1 pt-0.5">
								{#if shift.mine}
									<Badge
										tone={shift.mine.status === 'booked'
											? 'brand'
											: shift.mine.status === 'requested' ||
												  shift.mine.status === 'waitlisted' ||
												  shift.mine.status === 'held'
												? 'warning'
												: 'neutral'}
									>
										{i18n.t(`shifts.status.${shift.mine.status}`)}
									</Badge>
								{:else if urgent}
									<Badge tone="urgent">{i18n.t('shifts.urgent')}</Badge>
									<span class="text-sm font-semibold tabular-nums"
										>{i18n.t('shifts.free', { free })}</span
									>
								{:else if free === 0 && onMarket(shift)}
									<span class="text-sm font-semibold">{i18n.t('shifts.filter.market')}</span>
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
												{#if position.urgent}
													<p class="mt-1 flex flex-wrap items-center gap-2 text-sm">
														<Badge tone="urgent">{i18n.t('shifts.urgent')}</Badge>
														{#if position.urgent.bonus > 0}<span
																class="font-semibold text-brand-text"
																>{i18n.t('shifts.urgentBonus', {
																	bonus: position.urgent.bonus
																})}</span
															>{/if}
													</p>
													{#if position.urgent.note}<p class="mt-1 text-sm">
															{position.urgent.note}
														</p>{/if}
												{/if}
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

											{#if isMine && shift.mine && shift.mine.status === 'held'}
												<div class="flex flex-col items-end gap-1">
													<div class="flex gap-2">
														<form method="POST" action={act('cancel')} use:enhance>
															<input
																type="hidden"
																name="assignmentId"
																value={shift.mine.assignmentId}
															/>
															<Button type="submit" variant="secondary"
																>{i18n.t('shifts.hold.decline')}</Button
															>
														</form>
														<form method="POST" action={act('acceptHold')} use:enhance>
															<input
																type="hidden"
																name="assignmentId"
																value={shift.mine.assignmentId}
															/>
															<Button type="submit">{i18n.t('shifts.hold.accept')}</Button>
														</form>
													</div>
													{#if shift.mine.holdUntil}
														<p class="text-xs text-ink-muted">
															{i18n.t('shifts.hold.until', {
																date: formatDateTime(
																	new Date(shift.mine.holdUntil),
																	i18n.locale,
																	tz
																)
															})}
														</p>
													{/if}
												</div>
											{:else if isMine && shift.mine}
												<div class="flex flex-col items-end gap-1">
													{#if shift.mine.canCancel}
														<ConfirmForm
															action={act('cancel')}
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
													{#if shift.mine.status === 'booked' && data.features.swap && !shift.past}
														{#if shift.mine.offer}
															<p class="text-right text-xs font-semibold">
																{offerLabel(shift.mine.offer)}
															</p>
															<form method="POST" action={act('withdrawOffer')} use:enhance>
																<input type="hidden" name="offerId" value={shift.mine.offer.id} />
																<button
																	type="submit"
																	class="text-xs font-semibold text-brand-text hover:underline"
																	>{i18n.t('shifts.offer.withdraw')}</button
																>
															</form>
														{:else}
															<button
																type="button"
																class="text-sm font-semibold text-brand-text hover:underline"
																onclick={() => shift.mine && openGiveAway(shift.mine.assignmentId)}
																>{i18n.t('shifts.giveAway')}</button
															>
														{/if}
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
												{:else if position.marketOfferId && !position.required.some((q) => !q.held)}
													<form
														method="POST"
														action={act('take')}
														use:enhance
														class="flex flex-col items-end gap-1"
													>
														<input type="hidden" name="offerId" value={position.marketOfferId} />
														<Button type="submit">{i18n.t('shifts.market.take')}</Button>
														<span class="text-xs text-ink-muted"
															>{i18n.t('shifts.market.available')}</span
														>
													</form>
												{:else if position.free > 0}
													<div class="flex flex-col items-end gap-1">
														<form
															method="POST"
															action={act('book')}
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
														{#if data.buddies.length && position.mode === 'open' && position.free > 1}
															<button
																type="button"
																class="text-sm font-semibold text-brand-text hover:underline"
																aria-expanded={groupFor === position.id}
																onclick={() =>
																	(groupFor = groupFor === position.id ? null : position.id)}
																>{i18n.t('shifts.group.book')}</button
															>
														{/if}
													</div>
												{:else if shift.waitlistEnabled && !position.required.some((q) => !q.held)}
													<form
														method="POST"
														action={act('waitlist')}
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
											{#if groupFor === position.id}
												<form
													method="POST"
													action={act('bookGroup')}
													use:enhance={() =>
														async ({ update, result: r }) => {
															await update({ reset: false });
															if (r.type === 'success') groupFor = null;
														}}
													class="w-full space-y-3 rounded-md border border-line bg-surface-raised p-3"
												>
													<input type="hidden" name="positionId" value={position.id} />
													<fieldset>
														<legend class="text-sm font-bold"
															>{i18n.t('shifts.group.choose')}</legend
														>
														<div class="mt-2 space-y-1">
															{#each data.buddies.slice(0, position.free - 1) as buddy (buddy.id)}
																<label class="flex items-center gap-3 py-1">
																	<input
																		type="checkbox"
																		name="members[]"
																		value={buddy.id}
																		checked
																		class="size-4"
																	/>
																	{buddy.name}
																</label>
															{/each}
														</div>
													</fieldset>
													<p class="text-xs text-ink-muted">
														{i18n.t('shifts.group.hint', { hours: data.features.groupHoldHours })}
													</p>
													{#if result?.action === 'bookGroup' && result.positionId === position.id && result.problems}
														<div class="text-sm" role="alert">
															<p class="font-semibold">{i18n.t('shifts.group.problems')}</p>
															<ul class="mt-1 list-disc pl-5">
																{#each result.problems as p, i (i)}
																	<li>
																		{p.name}
																		{i18n.t(`shifts.group.problem.${p.problem}` as MessageKey)}
																	</li>
																{/each}
															</ul>
														</div>
													{/if}
													<Button type="submit" size="sm">{i18n.t('shifts.group.submit')}</Button>
												</form>
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

<dialog
	bind:this={giveAwayDialog}
	class="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-lg border border-ink/20 bg-surface-raised p-0 text-ink shadow-[0_20px_60px_-20px_rgb(0_0_0/0.45)] backdrop:bg-ink/50"
	aria-labelledby="give-away-title"
>
	<div class="space-y-5 p-5">
		<div>
			<h2 id="give-away-title" class="text-lg font-bold">{i18n.t('shifts.giveAway.title')}</h2>
			<p class="mt-1 text-sm text-ink-muted">{i18n.t('shifts.giveAway.lead')}</p>
		</div>
		<form
			method="POST"
			action={act('offer')}
			use:enhance
			class="space-y-2 border-t border-line pt-4"
		>
			<input type="hidden" name="assignmentId" value={giveAwayId ?? ''} />
			<p class="font-semibold">{i18n.t('shifts.giveAway.market')}</p>
			<p class="text-sm text-ink-muted">{i18n.t('shifts.giveAway.marketHint')}</p>
			<Button type="submit" variant="secondary">{i18n.t('shifts.giveAway.market')}</Button>
		</form>
		<form
			method="POST"
			action={act('offer')}
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
			class="space-y-3 border-t border-line pt-4"
		>
			<input type="hidden" name="assignmentId" value={giveAwayId ?? ''} />
			<p class="font-semibold">{i18n.t('shifts.giveAway.person')}</p>
			<p class="text-sm text-ink-muted">{i18n.t('shifts.giveAway.personHint')}</p>
			<Field
				label={i18n.t('shifts.giveAway.email')}
				name="email"
				type="email"
				autocomplete="off"
				required
				value={result?.action === 'offer' ? (result.values?.email ?? '') : ''}
				error={result?.action === 'offer' ? result.errors?.email : undefined}
			/>
			<Button type="submit">{i18n.t('shifts.giveAway.send')}</Button>
		</form>
		<div class="flex justify-end border-t border-line pt-4">
			<Button type="button" variant="ghost" onclick={() => giveAwayDialog?.close()}
				>{i18n.t('common.cancel')}</Button
			>
		</div>
	</div>
</dialog>

<Toast message={toastMessage} tone={result?.error ? 'error' : 'success'} token={form} />
