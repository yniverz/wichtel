<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import Card from '#lib/components/Card.svelte';
	import ConfirmForm from '#lib/components/ConfirmForm.svelte';
	import Field from '#lib/components/Field.svelte';
	import FormMessage from '#lib/components/FormMessage.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { pendingForm } from '#lib/forms.svelte.ts';
	import { getI18n } from '#lib/i18n/context.ts';
	import { formatDate } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = getI18n();
	const createForm = pendingForm();
	type Result = {
		action?: string;
		error?: string;
		success?: string;
		errors?: Record<string, string>;
		values?: Record<string, string>;
	};
	const result = $derived(form as Result | null);
	const createResult = $derived(result?.action === 'create' ? result : null);
	let showCreate = $state(false);
	$effect(() => {
		if (data.list.length === 0) showCreate = true;
	});
</script>

<svelte:head
	><title>{i18n.t('admin.editions.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.editions.title')} lead={i18n.t('admin.editions.lead')}>
	{#snippet actions()}
		{#if !showCreate}<Button onclick={() => (showCreate = true)}
				>{i18n.t('admin.editions.new')}</Button
			>{/if}
	{/snippet}
</PageHeader>

{#if result?.action === 'makeCurrent'}
	<div class="mb-4"><FormMessage error={result.error} success={result.success} /></div>
{/if}

{#if showCreate}
	<Card title={i18n.t('admin.editions.new')} class="mb-6">
		<form method="POST" action="?/create" class="space-y-4" use:enhance={createForm.submit}>
			<FormMessage error={createResult?.error} success={createResult?.success} />
			<Field
				label={i18n.t('admin.editions.name')}
				name="name"
				placeholder={i18n.t('admin.editions.namePlaceholder')}
				value={createResult?.values?.name ?? ''}
				error={createResult?.errors?.name}
			/>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={i18n.t('admin.editions.startsOn')}
					name="startsOn"
					type="date"
					value={createResult?.values?.startsOn ?? ''}
					error={createResult?.errors?.startsOn}
				/>
				<Field
					label={i18n.t('admin.editions.endsOn')}
					name="endsOn"
					type="date"
					value={createResult?.values?.endsOn ?? ''}
					error={createResult?.errors?.endsOn}
				/>
			</div>
			<div class="flex gap-2">
				<Button type="submit" loading={createForm.pending}>{i18n.t('common.create')}</Button>
				{#if data.list.length > 0}
					<Button type="button" variant="ghost" onclick={() => (showCreate = false)}
						>{i18n.t('common.cancel')}</Button
					>
				{/if}
			</div>
		</form>
	</Card>
{/if}

{#if data.list.length === 0}
	<p class="text-ink-muted">{i18n.t('admin.editions.empty')}</p>
{:else}
	<ul class="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-raised">
		{#each data.list as edition (edition.id)}
			<li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<a href="/admin/editions/{edition.id}" class="font-semibold hover:text-brand-text"
							>{edition.name}</a
						>
						{#if edition.isCurrent}<Badge tone="brand">{i18n.t('admin.editions.current')}</Badge
							>{/if}
						{#if edition.archivedAt}<Badge>{i18n.t('admin.editions.archived')}</Badge>{/if}
					</div>
					<p class="text-sm text-ink-muted">
						{formatDate(edition.startsOn, i18n.locale)} – {formatDate(edition.endsOn, i18n.locale)}
					</p>
				</div>
				<div class="flex flex-wrap gap-2">
					{#if !edition.isCurrent}
						<ConfirmForm
							action="?/makeCurrent"
							hidden={{ id: edition.id }}
							variant="secondary"
							message={i18n.t('admin.editions.makeCurrent') + ': ' + edition.name + '?'}
							confirmLabel={i18n.t('admin.editions.makeCurrent')}
						>
							{i18n.t('admin.editions.makeCurrent')}
						</ConfirmForm>
					{/if}
					<Button href="/admin/editions/{edition.id}" size="sm" variant="ghost"
						>{i18n.t('common.edit')}</Button
					>
				</div>
			</li>
		{/each}
	</ul>
{/if}
