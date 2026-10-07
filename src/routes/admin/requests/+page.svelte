<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Toast from '#lib/components/Toast.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDayShort, formatTime, localized } from '#lib/i18n/index.ts';
	import { utcToZoned } from '#lib/domain/time.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const result = $derived(form as { success?: string; error?: string } | null);
	type Ref = { titleDe: string; titleEn: string; startsAt: string; endsAt: string };
	const when = (s: Ref) =>
		`${formatDayShort(utcToZoned(new Date(s.startsAt), data.timezone).date, i18n.locale)}, ${formatTime(s.startsAt, i18n.locale, data.timezone)}–${formatTime(s.endsAt, i18n.locale, data.timezone)}`;
</script>

<svelte:head
	><title>{i18n.t('admin.requests.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.requests.title')} lead={i18n.t('admin.requests.lead')} />

{#snippet decide(action: string, id: string)}
	<form method="POST" {action} use:enhance class="flex gap-2">
		<input type="hidden" name="id" value={id} />
		<Button type="submit" name="approve" value="on" size="sm"
			>{i18n.t('admin.shifts.approve')}</Button
		>
		<Button type="submit" name="approve" value="" size="sm" variant="secondary"
			>{i18n.t('admin.shifts.reject')}</Button
		>
	</form>
{/snippet}

<div class="space-y-12">
	<section aria-labelledby="swaps">
		<h2 id="swaps" class="border-b-2 border-ink pb-1 text-lg font-bold">
			{i18n.t('admin.requests.swaps')}
			<span class="ml-1 text-sm font-normal text-ink-muted tabular-nums">{data.swaps.length}</span>
		</h2>
		{#if data.swaps.length === 0}
			<p class="py-3 text-sm text-ink-muted">{i18n.t('admin.requests.none')}</p>
		{:else}
			<ul class="divide-y divide-line">
				{#each data.swaps as swap (swap.id)}
					<li class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
						<div class="min-w-0">
							<a href="/admin/shifts/{swap.shift.id}" class="font-bold hover:underline"
								>{localized(swap.shift, 'title', i18n.locale)}</a
							>
							<span class="text-sm text-ink-muted"
								>· {localized(
									{ nameDe: swap.positionNameDe, nameEn: swap.positionNameEn },
									'name',
									i18n.locale
								)}</span
							>
							<p class="text-sm tabular-nums">{when(swap.shift)}</p>
							<p class="mt-1 text-sm">
								{swap.counter
									? i18n.t('admin.requests.exchange', {
											from: swap.from,
											to: swap.to,
											shift: `${localized(swap.counter, 'title', i18n.locale)} (${when(swap.counter)})`
										})
									: i18n.t('admin.requests.handover', { from: swap.from, to: swap.to })}
							</p>
						</div>
						{@render decide('?/swap', swap.id)}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section aria-labelledby="bookings">
		<h2 id="bookings" class="border-b-2 border-ink pb-1 text-lg font-bold">
			{i18n.t('admin.requests.bookings')}
			<span class="ml-1 text-sm font-normal text-ink-muted tabular-nums"
				>{data.requests.length}</span
			>
		</h2>
		{#if data.requests.length === 0}
			<p class="py-3 text-sm text-ink-muted">{i18n.t('admin.requests.none')}</p>
		{:else}
			<ul class="divide-y divide-line">
				{#each data.requests as request (request.id)}
					<li class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
						<div class="min-w-0">
							<a href="/admin/people/{request.userId}" class="font-bold hover:underline"
								>{request.name}</a
							>
							<p class="text-sm">
								<a href="/admin/shifts/{request.shift.id}" class="hover:underline"
									>{localized(request.shift, 'title', i18n.locale)}</a
								>
								<span class="text-ink-muted"
									>· {localized(
										{ nameDe: request.positionNameDe, nameEn: request.positionNameEn },
										'name',
										i18n.locale
									)}</span
								>
							</p>
							<p class="text-sm tabular-nums">{when(request.shift)}</p>
						</div>
						{@render decide('?/request', request.id)}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<Toast
	message={result?.error ?? result?.success}
	tone={result?.error ? 'error' : 'success'}
	token={form}
/>
