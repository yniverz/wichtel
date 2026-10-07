<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDate, localized, type MessageKey } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	type Result = { action?: string; error?: string; success?: string };
	const result = $derived(form as Result | null);
	// svelte-ignore state_referenced_locally
	let open = $state<string | null>(data.open);
	const submitter = pendingForm();
	const tones: Record<string, string> = {
		approved: 'bg-brand text-brand-fg',
		pending: 'bg-accent text-accent-fg',
		rejected: 'border border-line text-ink-muted',
		expired: 'border border-line text-ink-muted',
		none: 'border border-line text-ink-muted'
	};
</script>

<svelte:head><title>{i18n.t('quals.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<header class="border-b border-ink pb-4">
	<a href="/app/profile" class="text-sm text-ink-muted hover:text-ink">← {i18n.t('nav.profile')}</a>
	<h1 class="font-display mt-2 text-5xl uppercase sm:text-6xl">{i18n.t('quals.title')}</h1>
	<p class="mt-2 max-w-prose text-ink-muted">{i18n.t('quals.lead')}</p>
</header>

{#if data.qualifications.length === 0}
	<p class="mt-8 text-ink-muted">{i18n.t('quals.empty')}</p>
{:else}
	<ul class="mx-auto mt-6 max-w-2xl divide-y divide-line">
		{#each data.qualifications as q (q.id)}
			{@const canApply = q.status !== 'approved' && q.status !== 'pending'}
			<li class="py-4" id={q.id}>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="font-bold">{localized(q, 'name', i18n.locale)}</p>
						{#if localized(q, 'description', i18n.locale)}<p class="text-sm text-ink-muted">
								{localized(q, 'description', i18n.locale)}
							</p>{/if}
						<p class="mt-1 flex flex-wrap items-center gap-2 text-sm">
							<span class="rounded-sm px-1.5 py-px text-xs font-semibold {tones[q.status]}"
								>{i18n.t(`quals.status.${q.status}` as MessageKey)}</span
							>
							{#if q.status === 'approved' && q.expiresAt}<span class="text-ink-muted"
									>{i18n.t('quals.validUntil', {
										date: formatDate(new Date(q.expiresAt), i18n.locale)
									})}</span
								>{/if}
						</p>
						{#if q.reviewNote}<p class="mt-1 text-sm">
								{i18n.t('quals.reviewNote', { note: q.reviewNote })}
							</p>{/if}
					</div>
					{#if canApply && open !== q.id}
						<Button variant="secondary" size="sm" onclick={() => (open = q.id)}>
							{q.status === 'none' ? i18n.t('quals.apply') : i18n.t('quals.reapply')}
						</Button>
					{/if}
				</div>

				{#if result?.action === q.id}<div class="mt-3">
						<FormMessage error={result.error} success={result.success} />
					</div>{/if}

				{#if canApply && open === q.id}
					<form
						method="POST"
						enctype="multipart/form-data"
						class="mt-4 space-y-4 rounded-md border border-line bg-surface-raised p-4"
						use:enhance={submitter.submit}
					>
						<input type="hidden" name="qualificationId" value={q.id} />
						{#if q.proof !== 'upload'}
							<label class="flex items-start gap-3 text-sm"
								><input type="checkbox" name="confirmed" class="mt-0.5 size-4" />{i18n.t(
									'quals.confirm'
								)}</label
							>
						{/if}
						{#if q.proof !== 'confirm'}
							<div class="space-y-1.5">
								<label for="doc-{q.id}" class="text-sm font-medium"
									>{i18n.t('quals.document')}</label
								>
								<input
									id="doc-{q.id}"
									type="file"
									name="document"
									accept="application/pdf,image/png,image/jpeg,image/webp"
									required={q.proof === 'upload'}
									class="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-3 file:py-2 file:text-sm file:font-semibold file:text-surface"
								/>
								<p class="text-xs text-ink-muted">
									{i18n.t('quals.privacy')}{#if q.deletedAfterReview}{' '}{i18n.t(
											'quals.deletedAfterReview'
										)}{/if}
								</p>
							</div>
						{/if}
						<div class="space-y-1.5">
							<label for="note-{q.id}" class="flex justify-between text-sm font-medium"
								>{i18n.t('quals.note')}<span class="text-xs font-normal text-ink-muted"
									>{i18n.t('common.optional')}</span
								></label
							>
							<textarea id="note-{q.id}" name="note" rows="2" class="block w-full"></textarea>
						</div>
						<div class="flex gap-2">
							<Button type="submit" loading={submitter.pending}>{i18n.t('quals.submit')}</Button>
							<Button type="button" variant="ghost" onclick={() => (open = null)}
								>{i18n.t('common.cancel')}</Button
							>
						</div>
					</form>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
