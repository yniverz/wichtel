<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import Field from '#lib/components/Field.svelte';
	import Toast from '#lib/components/Toast.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDayShort, formatTime, localized } from '#lib/i18n/index.ts';
	import { utcToZoned } from '#lib/domain/time.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	type Result = {
		action?: string;
		success?: string;
		error?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	let copied = $state(false);
</script>

<svelte:head><title>{i18n.t('group.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<header class="border-b border-ink pb-4">
	<h1 class="font-display text-5xl uppercase sm:text-6xl">
		{data.group ? data.group.name : i18n.t('group.title')}
	</h1>
	<p class="mt-2 max-w-prose text-ink-muted">{i18n.t('group.lead')}</p>
</header>

{#if !data.enabled}
	<p class="mt-8 text-ink-muted">{i18n.t('group.disabled')}</p>
{:else if !data.group}
	<div class="mt-8 grid gap-10 md:grid-cols-2">
		<form method="POST" action="?/join" use:enhance class="space-y-4">
			<h2 class="border-b border-line pb-2 text-sm font-bold">{i18n.t('group.join.title')}</h2>
			<Field
				label={i18n.t('group.join.code')}
				name="code"
				autocomplete="off"
				autocapitalize="characters"
				value={result?.action === 'join' ? (result.values?.code ?? '') : data.code}
				error={result?.action === 'join' ? result.errors?.code : undefined}
			/>
			<Button type="submit" variant={data.code ? 'primary' : 'secondary'}
				>{i18n.t('group.join.submit')}</Button
			>
		</form>
		<form method="POST" action="?/create" use:enhance class="space-y-4">
			<h2 class="border-b border-line pb-2 text-sm font-bold">{i18n.t('group.create.title')}</h2>
			<Field
				label={i18n.t('group.create.name')}
				name="name"
				placeholder={i18n.t('group.create.namePlaceholder')}
				value={result?.action === 'create' ? (result.values?.name ?? '') : ''}
				error={result?.action === 'create' ? result.errors?.name : undefined}
			/>
			<Button type="submit" variant={data.code ? 'secondary' : 'primary'}
				>{i18n.t('group.create.submit')}</Button
			>
		</form>
	</div>
{:else}
	<div class="mt-8 grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
		<section aria-labelledby="members">
			<h2 id="members" class="flex justify-between border-b-2 border-ink pb-1 text-sm font-bold">
				{i18n.t('group.members')}
				<span class="font-normal text-ink-muted tabular-nums"
					>{i18n.t('group.size', { count: data.group.members.length, max: data.maxSize })}</span
				>
			</h2>
			<ul class="divide-y divide-line border-b border-line">
				{#each data.group.members as member (member.id)}
					<li class="py-3">
						<p class="font-bold">
							{member.name}
							{#if member.isYou}<span class="font-normal text-ink-muted"
									>({i18n.t('group.you')})</span
								>{/if}
						</p>
						{#if member.shifts.length === 0}
							<p class="text-sm text-ink-muted">{i18n.t('group.noShifts')}</p>
						{:else}
							<ul class="mt-1 space-y-0.5 text-sm">
								{#each member.shifts as shift (shift.id)}
									<li class="grid grid-cols-[7.5rem_1fr] gap-2">
										<span class="text-ink-muted tabular-nums"
											>{formatDayShort(
												utcToZoned(new Date(shift.startsAt), data.timezone).date,
												i18n.locale
											)}
											{formatTime(shift.startsAt, i18n.locale, data.timezone)}</span
										>
										<a href="/app/shifts?shift={shift.id}" class="hover:underline"
											>{localized(shift, 'title', i18n.locale)}{#if shift.status !== 'booked'}
												<span class="text-ink-muted">
													· {i18n.t(`shifts.status.${shift.status as 'held' | 'requested'}`)}</span
												>{/if}</a
										>
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ul>
		</section>

		<section aria-labelledby="invite" class="space-y-3">
			<h2 id="invite" class="border-b border-line pb-2 text-sm font-bold">
				{i18n.t('group.invite')}
			</h2>
			<p class="text-sm text-ink-muted">{i18n.t('group.inviteHint')}</p>
			<p class="font-display text-3xl tracking-wider tabular-nums">{data.group.code}</p>
			<div class="flex flex-wrap gap-2">
				<Button
					variant="secondary"
					onclick={async () => {
						await navigator.clipboard.writeText(data.group?.link ?? '');
						copied = true;
						setTimeout(() => (copied = false), 2000);
					}}>{copied ? i18n.t('group.copied') : i18n.t('group.copy')}</Button
				>
				<ConfirmForm
					action="?/rotate"
					variant="ghost"
					message={i18n.t('group.rotateConfirm')}
					confirmLabel={i18n.t('group.rotate')}
				>
					{i18n.t('group.rotate')}
				</ConfirmForm>
			</div>
			<div class="border-t border-line pt-6">
				<ConfirmForm
					action="?/leave"
					message={i18n.t('group.leaveConfirm')}
					confirmLabel={i18n.t('group.leave')}
				>
					{i18n.t('group.leave')}
				</ConfirmForm>
			</div>
		</section>
	</div>
{/if}

<Toast
	message={result?.success ??
		(result?.error && Object.keys(result.errors ?? {}).length === 0 ? result.error : null)}
	tone={result?.error ? 'error' : 'success'}
	token={form}
/>
