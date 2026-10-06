<script lang="ts">
	import { page } from '$app/state';
	import Badge from '#lib/components/Badge.svelte';
	import Button from '#lib/components/Button.svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import { getI18n } from '#lib/i18n/context.ts';
	import { localized } from '#lib/i18n/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = getI18n();
</script>

<svelte:head
	><title>{i18n.t('admin.areas.title')} · {page.data.settings.festivalName}</title></svelte:head
>

<PageHeader title={i18n.t('admin.areas.title')} lead={i18n.t('admin.areas.lead')}>
	{#snippet actions()}
		{#if data.canCreateRoot}<Button href="/admin/areas/new">{i18n.t('admin.areas.new')}</Button
			>{/if}
	{/snippet}
</PageHeader>

{#if data.areas.length === 0}
	<div class="rounded-xl border border-dashed border-line p-10 text-center text-ink-muted">
		<p>{i18n.t('admin.areas.empty')}</p>
		{#if data.canCreateRoot}<div class="mt-4">
				<Button href="/admin/areas/new">{i18n.t('admin.areas.new')}</Button>
			</div>{/if}
	</div>
{:else}
	<ul class="overflow-hidden rounded-xl border border-line bg-surface-raised" role="tree">
		{#each data.areas as area (area.id)}
			<li
				role="treeitem"
				aria-level={area.depth + 1}
				aria-selected="false"
				class="group flex items-center gap-3 border-b border-line py-3 pr-3 last:border-b-0"
				style="padding-left: {1 + area.depth * 1.5}rem"
			>
				{#if area.depth > 0}<span class="text-line" aria-hidden="true">└</span>{/if}
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-medium">{localized(area, 'name', i18n.locale)}</span>
						{#if !area.nameEn}<Badge tone="warning">{i18n.t('admin.areas.missingEn')}</Badge>{/if}
					</div>
					{#if localized(area, 'description', i18n.locale)}
						<p class="truncate text-sm text-ink-muted">
							{localized(area, 'description', i18n.locale)}
						</p>
					{/if}
				</div>
				{#if area.canManage}
					<div class="flex shrink-0 gap-1">
						<Button href="/admin/areas/new?parent={area.id}" size="sm" variant="ghost"
							>+ {i18n.t('admin.areas.newChild')}</Button
						>
						<Button href="/admin/areas/{area.id}" size="sm" variant="secondary"
							>{i18n.t('common.edit')}</Button
						>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
