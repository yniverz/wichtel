<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Toast from '#lib/components/Toast.svelte';
	import Button from '#lib/components/Button.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import Alert from '#lib/components/Alert.svelte';
	import Badge from '#lib/components/Badge.svelte';
	import PlaceDetails from '#lib/components/places/PlaceDetails.svelte';
	import {
		formatDateRange,
		formatDateTime,
		formatDayShort,
		formatTime,
		localized
	} from '#lib/i18n/index.ts';
	import { utcToZoned } from '#lib/domain/time.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const result = $derived(form as { success?: string; error?: string } | null);
	const todoCount = $derived(
		data.todo.holds.length +
			data.todo.offers.length +
			data.todo.proposals.length +
			data.todo.pending.length
	);
	type Ref = { titleDe: string; titleEn: string; startsAt: string; endsAt: string };
	const when = (s: Ref) =>
		`${formatDayShort(utcToZoned(new Date(s.startsAt), data.timezone).date, i18n.locale)}, ${formatTime(s.startsAt, i18n.locale, data.timezone)}–${formatTime(s.endsAt, i18n.locale, data.timezone)}`;
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

	{#if todoCount > 0}
		<section aria-labelledby="todo">
			<h2 id="todo" class="border-b-2 border-ink pb-1 text-sm font-bold">
				{i18n.t('app.home.todo.title')}
				<span class="ml-1 font-normal text-ink-muted tabular-nums">{todoCount}</span>
			</h2>
			<ul class="divide-y divide-line border-b border-line">
				{#each data.todo.holds as hold (hold.assignmentId)}
					<li class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
						<div class="min-w-0">
							<p class="text-sm text-ink-muted">
								{i18n.t('app.home.todo.hold', { person: hold.person })}
							</p>
							<a href="/app/shifts?shift={hold.shift.id}" class="font-bold hover:underline"
								>{localized(hold.shift, 'title', i18n.locale)}</a
							>
							<p class="text-sm tabular-nums">{when(hold.shift)}</p>
							{#if hold.holdUntil}
								<p class="text-xs text-ink-muted">
									{i18n.t('shifts.hold.until', {
										date: formatDateTime(new Date(hold.holdUntil), i18n.locale, data.timezone)
									})}
								</p>
							{/if}
						</div>
						<div class="flex gap-2">
							<form method="POST" action="?/declineHold" use:enhance>
								<input type="hidden" name="assignmentId" value={hold.assignmentId} />
								<Button type="submit" variant="secondary">{i18n.t('shifts.hold.decline')}</Button>
							</form>
							<form method="POST" action="?/acceptHold" use:enhance>
								<input type="hidden" name="assignmentId" value={hold.assignmentId} />
								<Button type="submit">{i18n.t('shifts.hold.accept')}</Button>
							</form>
						</div>
					</li>
				{/each}
				{#each data.todo.offers as offer (offer.id)}
					<li class="space-y-3 py-4">
						<div>
							<p class="text-sm text-ink-muted">
								{i18n.t('app.home.todo.offer', { person: offer.person })}
							</p>
							<a href="/app/shifts?shift={offer.shift.id}" class="font-bold hover:underline"
								>{localized(offer.shift, 'title', i18n.locale)}</a
							>
							<p class="text-sm tabular-nums">{when(offer.shift)}</p>
						</div>
						<div class="flex flex-wrap items-end gap-2">
							<form
								method="POST"
								action="?/take"
								use:enhance
								class="flex flex-wrap items-end gap-2"
							>
								<input type="hidden" name="offerId" value={offer.id} />
								{#if data.counterOptions.length}
									<label class="block text-sm">
										<span class="mb-1 block font-semibold">{i18n.t('app.home.todo.swapWith')}</span>
										<select name="counterAssignmentId" class="h-11 max-w-72">
											<option value="">{i18n.t('app.home.todo.swapNone')}</option>
											{#each data.counterOptions as option (option.assignmentId)}
												<option value={option.assignmentId}
													>{formatDayShort(
														utcToZoned(new Date(option.startsAt), data.timezone).date,
														i18n.locale
													)}
													{formatTime(option.startsAt, i18n.locale, data.timezone)} · {localized(
														option,
														'title',
														i18n.locale
													)}</option
												>
											{/each}
										</select>
									</label>
								{/if}
								<Button type="submit">{i18n.t('app.home.todo.take')}</Button>
							</form>
							<form method="POST" action="?/decline" use:enhance>
								<input type="hidden" name="offerId" value={offer.id} />
								<Button type="submit" variant="ghost">{i18n.t('app.home.todo.decline')}</Button>
							</form>
						</div>
					</li>
				{/each}
				{#each data.todo.proposals as proposal (proposal.id)}
					<li class="space-y-3 py-4">
						<p class="text-sm text-ink-muted">
							{i18n.t('app.home.todo.proposal', { person: proposal.person })}
						</p>
						<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<dt class="text-ink-muted">{i18n.t('app.home.todo.proposalGive')}</dt>
							<dd>
								<span class="font-bold">{localized(proposal.give, 'title', i18n.locale)}</span>
								<span class="tabular-nums">· {when(proposal.give)}</span>
							</dd>
							<dt class="text-ink-muted">{i18n.t('app.home.todo.proposalGet')}</dt>
							<dd>
								<a href="/app/shifts?shift={proposal.get.id}" class="font-bold hover:underline"
									>{localized(proposal.get, 'title', i18n.locale)}</a
								>
								<span class="tabular-nums">· {when(proposal.get)}</span>
							</dd>
						</dl>
						<form method="POST" action="?/answer" use:enhance class="flex gap-2">
							<input type="hidden" name="offerId" value={proposal.id} />
							<Button type="submit" name="accept" value="on"
								>{i18n.t('app.home.todo.accept')}</Button
							>
							<Button type="submit" name="accept" value="" variant="ghost"
								>{i18n.t('app.home.todo.decline')}</Button
							>
						</form>
					</li>
				{/each}
				{#each data.todo.pending as item (item.id)}
					<li class="flex flex-wrap items-center justify-between gap-3 py-4">
						<div>
							<p class="font-bold">{localized(item.shift, 'title', i18n.locale)}</p>
							<p class="text-sm tabular-nums">{when(item.shift)}</p>
						</div>
						<Badge tone="warning">{i18n.t('app.home.todo.pending')}</Badge>
					</li>
				{/each}
			</ul>
		</section>
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
									{#if shift.mine?.status === 'requested' || shift.mine?.status === 'held'}<Badge
											tone="warning">{i18n.t(`shifts.status.${shift.mine.status}`)}</Badge
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
				<p class="font-display mt-3 text-7xl text-brand-text tabular-nums">{data.points}</p>
				<p class="mt-2 text-sm text-ink-muted">{i18n.t('app.home.points.text')}</p>

				{#if data.groupsEnabled}
					<h2 class="mt-10 border-b border-line pb-2 text-sm font-bold">
						{i18n.t('app.home.group.title')}
					</h2>
					{#if data.group}
						<p class="mt-3 font-bold">{data.group.name}</p>
						<p class="text-sm text-ink-muted">
							{i18n.t('app.home.group.members', { count: data.group.size })}
						</p>
						<a
							href="/app/group"
							class="mt-2 inline-block text-sm font-semibold text-brand-text hover:underline"
							>{i18n.t('app.home.group.open')} →</a
						>
					{:else}
						<p class="mt-3 text-sm text-ink-muted">{i18n.t('app.home.group.none')}</p>
						<a
							href="/app/group"
							class="mt-2 inline-block text-sm font-semibold text-brand-text hover:underline"
							>{i18n.t('app.home.group.start')} →</a
						>
					{/if}
				{/if}
			</section>
		</div>
	{/if}

	{#if data.urgent.length}
		<section aria-labelledby="urgent">
			<h2 id="urgent" class="border-b-2 border-brand pb-1 text-sm font-bold text-brand-text">
				{i18n.t('app.home.urgent.title')}
			</h2>
			<ul>
				{#each data.urgent as shift (shift.id)}
					<li class="border-b border-line">
						<a
							href="/app/shifts?shift={shift.id}"
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
							<span class="font-bold">{localized(shift, 'title', i18n.locale)}</span>
							{#if shift.bonus > 0}<span class="text-sm font-semibold text-brand-text"
									>{i18n.t('shifts.urgentBonus', { bonus: shift.bonus })}</span
								>{/if}
						</a>
					</li>
				{/each}
			</ul>
		</section>
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

<Toast
	message={result?.error ?? result?.success}
	tone={result?.error ? 'error' : 'success'}
	token={form}
/>
