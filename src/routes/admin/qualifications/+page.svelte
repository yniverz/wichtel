<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Button from '#lib/components/Button.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Toast from '#lib/components/Toast.svelte';
	import QualificationForm from '#lib/components/admin/QualificationForm.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDate, localized, type MessageKey } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	type Result = {
		action?: string;
		error?: string;
		success?: string;
		errors?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const empty = {
		nameDe: '',
		nameEn: '',
		descriptionDe: '',
		descriptionEn: '',
		proof: 'either',
		documentRetention: 'delete_after_review',
		validityDays: null,
		active: true,
		sortOrder: 0
	};
</script>

<svelte:head
	><title>{i18n.t('admin.quals.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.quals.title')} lead={i18n.t('admin.quals.lead')} />

<div class="grid gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
	<div class="space-y-10">
		{#if data.can.review}
			<section aria-labelledby="pending">
				<h2 id="pending" class="border-b-2 border-ink pb-1 text-sm font-bold">
					{i18n.t('admin.quals.pending')} ({data.pending.length})
				</h2>
				{#if data.pending.length === 0}
					<p class="py-3 text-sm text-ink-muted">{i18n.t('admin.quals.pendingEmpty')}</p>
				{:else}
					<ul class="divide-y divide-line">
						{#each data.pending as p (p.id)}
							<li class="py-4">
								<div class="flex flex-wrap items-baseline justify-between gap-2">
									<p>
										<a href="/admin/people/{p.userId}" class="font-bold hover:underline"
											>{p.firstName} {p.lastName}</a
										>
										· {localized(
											{ nameDe: p.qualificationNameDe, nameEn: p.qualificationNameEn },
											'name',
											i18n.locale
										)}
									</p>
									<span class="text-xs text-ink-muted"
										>{formatDate(new Date(p.createdAt), i18n.locale)}</span
									>
								</div>
								{#if p.note}<p class="mt-1 text-sm">„{p.note}“</p>{/if}
								<p class="mt-1 text-sm">
									{#if p.documentId && data.can.documents}<a
											href="/documents/{p.id}"
											target="_blank"
											rel="noopener"
											class="font-semibold text-brand-text hover:underline"
											>{i18n.t('admin.quals.document')}: {p.documentName}</a
										>
									{:else if p.documentId}<span class="text-ink-muted">{p.documentName}</span>
									{:else}<span class="text-ink-muted">{i18n.t('admin.quals.confirmedOnly')}</span
										>{/if}
								</p>
								<form
									method="POST"
									action="?/review"
									use:enhance
									class="mt-3 flex flex-wrap items-end gap-2"
								>
									<input type="hidden" name="id" value={p.id} />
									<label class="sr-only" for="note-{p.id}">{i18n.t('admin.quals.reviewNote')}</label
									>
									<input
										id="note-{p.id}"
										type="text"
										name="reviewNote"
										placeholder={i18n.t('admin.quals.reviewNote')}
										class="h-9 min-w-0 flex-1 text-sm"
									/>
									<Button type="submit" name="approve" value="on" size="sm"
										>{i18n.t('admin.quals.approve')}</Button
									>
									<Button type="submit" name="approve" value="" size="sm" variant="secondary"
										>{i18n.t('admin.quals.reject')}</Button
									>
								</form>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			{#if data.recent.length}
				<section aria-labelledby="recent">
					<h2 id="recent" class="border-b-2 border-ink pb-1 text-sm font-bold">
						{i18n.t('admin.quals.recent')}
					</h2>
					<ul class="divide-y divide-line text-sm">
						{#each data.recent as r (r.id)}
							<li class="flex justify-between gap-3 py-2">
								<a href="/admin/people/{r.userId}" class="hover:underline"
									>{r.firstName}
									{r.lastName} · {localized(
										{ nameDe: r.qualificationNameDe, nameEn: r.qualificationNameEn },
										'name',
										i18n.locale
									)}</a
								>
								<span class="text-ink-muted"
									>{i18n.t(`quals.status.${r.status}` as MessageKey)}</span
								>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/if}
	</div>

	{#if data.can.manage}
		<section aria-labelledby="defs" class="space-y-4">
			<h2 id="defs" class="border-b-2 border-ink pb-1 text-sm font-bold">
				{i18n.t('admin.quals.definitions')}
			</h2>
			{#each data.definitions as q (q.id)}
				<details
					class="rounded-md border border-line bg-surface-raised"
					open={result?.action === q.id && !!result.errors}
				>
					<summary class="cursor-pointer px-4 py-3 font-semibold"
						>{localized(q, 'name', i18n.locale)}{#if !q.active}<span
								class="ml-2 text-xs font-normal text-ink-muted"
								>({i18n.t('admin.goodies.inactive')})</span
							>{/if}</summary
					>
					<div class="border-t border-line p-4">
						<QualificationForm
							values={q}
							result={result?.action === q.id ? result : null}
							submitLabel={i18n.t('common.save')}
						/>
					</div>
				</details>
			{/each}
			<details
				class="rounded-md border border-dashed border-line"
				open={data.definitions.length === 0 || result?.action === 'new'}
			>
				<summary class="cursor-pointer px-4 py-3 font-semibold text-brand-text"
					>+ {i18n.t('admin.quals.new')}</summary
				>
				<div class="border-t border-line p-4">
					<QualificationForm
						values={empty}
						result={result?.action === 'new' ? result : null}
						submitLabel={i18n.t('common.create')}
					/>
				</div>
			</details>
		</section>
	{/if}
</div>

<Toast
	message={result && !result.action ? (result.error ?? result.success) : null}
	tone={result?.error ? 'error' : 'success'}
	token={form}
/>
